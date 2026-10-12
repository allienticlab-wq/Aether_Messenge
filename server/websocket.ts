import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from './db.js';
import { Message, MessageReaction } from '../src/types/index.js';

interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  sessionId: string;
  isAlive: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedClient>> = new Map(); // userId -> Set of clients (multi-device)

  public initialize(server: Server) {
    if (this.wss) return;
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
      try {
        const url = new URL(req.url || '', 'http://localhost');
        if (url.pathname === '/ws' || url.pathname.startsWith('/ws')) {
          this.wss!.handleUpgrade(req, socket, head, (ws) => {
            this.wss!.emit('connection', ws, req);
          });
        }
      } catch {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', 'http://localhost');
      const userId = url.searchParams.get('userId');
      const sessionId = url.searchParams.get('sessionId') || 'default_session';

      const user = userId ? db.getUserById(userId) : undefined;
      if (!userId || !user) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      if (user.isSuspended || user.isBanned) {
        ws.close(4003, 'Account suspended: All communication privileges are frozen.');
        return;
      }

      const client: AuthenticatedClient = {
        ws,
        userId,
        sessionId,
        isAlive: true,
      };

      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)!.add(client);

      // Mark user online in database
      user.isOnline = true;
      user.lastSeen = new Date().toISOString();
      this.broadcastPresence(userId, true);

      // Heartbeat ping-pong
      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (data: Buffer | ArrayBuffer | string, isBinary: boolean) => {
        client.isAlive = true;
        try {
          if (isBinary || data instanceof Buffer || data instanceof ArrayBuffer) {
            const buf = Buffer.from(data as any);
            if (buf.length > 0) {
              const tag = buf[0];
              if (tag === 0x01) {
                // Binary Heartbeat PING -> respond immediately with 0x02 PONG
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(Buffer.from([0x02, 0x50, 0x4f, 0x4e, 0x47]));
                }
                return;
              } else if (tag === 0x02) {
                // Binary PONG ack
                return;
              } else if (tag === 0x03) {
                // High-speed binary JSON frame starting at index 1
                const jsonStr = buf.subarray(1).toString('utf-8');
                const payload = JSON.parse(jsonStr);
                this.handleClientMessage(client, payload);
                return;
              }
            }
          }

          const rawStr = data.toString('utf-8');
          const payload = JSON.parse(rawStr);
          if (payload.type === 'ping') {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
            return;
          }
          this.handleClientMessage(client, payload);
        } catch {
          // malformed packet ignored safely
        }
      });

      ws.on('close', () => {
        const userClients = this.clients.get(userId);
        if (userClients) {
          userClients.delete(client);
          if (userClients.size === 0) {
            this.clients.delete(userId);
            if (user) {
              user.isOnline = false;
              user.lastSeen = new Date().toISOString();
              this.broadcastPresence(userId, false);
            }
          }
        }
      });
    });

    // Clean up stale connections every 30 seconds
    const interval = setInterval(() => {
      if (!this.wss) return;
      for (const [, clientSet] of this.clients.entries()) {
        for (const client of clientSet) {
          if (!client.isAlive) {
            client.ws.terminate();
            clientSet.delete(client);
          } else {
            client.isAlive = false;
            client.ws.ping();
          }
        }
      }
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  public getActiveCount(): number {
    let count = 0;
    for (const set of this.clients.values()) {
      count += set.size;
    }
    return count;
  }

  private handleClientMessage(client: AuthenticatedClient, msg: any) {
    const user = db.getUserById(client.userId);
    if (!user || user.isSuspended || user.isBanned) {
      try {
        client.ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Account suspended: All communication privileges are frozen.' },
        }));
      } catch {}
      return;
    }

    const { type, payload } = msg;

    switch (type) {
      case 'typing_start': {
        const { chatId } = payload;
        this.broadcastToChat(chatId, {
          type: 'typing_indicator',
          payload: { chatId, userId: client.userId, isTyping: true },
        }, client.userId);
        break;
      }

      case 'typing_stop': {
        const { chatId } = payload;
        this.broadcastToChat(chatId, {
          type: 'typing_indicator',
          payload: { chatId, userId: client.userId, isTyping: false },
        }, client.userId);
        break;
      }

      case 'mark_read': {
        const { chatId, messageIds } = payload;
        const now = new Date().toISOString();
        const updatedIds: string[] = [];
        if (Array.isArray(messageIds) && messageIds.length > 0) {
          for (const mid of messageIds) {
            const m = db.state.messages.get(mid);
            if (m && m.chatId === chatId) {
              m.status = 'read';
              if (!m.readBy) m.readBy = [];
              if (!m.readBy.some(r => r.userId === client.userId)) {
                m.readBy.push({ userId: client.userId, readAt: now });
              }
              updatedIds.push(m.id);
            }
          }
        } else {
          for (const m of db.state.messages.values()) {
            if (m.chatId === chatId && m.senderId !== client.userId) {
              m.status = 'read';
              if (!m.readBy) m.readBy = [];
              if (!m.readBy.some(r => r.userId === client.userId)) {
                m.readBy.push({ userId: client.userId, readAt: now });
              }
              updatedIds.push(m.id);
            }
          }
        }
        const chat = db.state.chats.get(chatId);
        if (chat) chat.unreadCount = 0;
        this.broadcastToChat(chatId, {
          type: 'messages_read',
          payload: { chatId, userId: client.userId, messageIds: updatedIds, readAt: now },
        });
        break;
      }

      // WebRTC Signaling
      case 'webrtc_call_offer':
      case 'webrtc_call_answer':
      case 'webrtc_ice_candidate':
      case 'webrtc_call_end':
      case 'webrtc_media_toggle': {
        const { targetUserId, chatId } = payload;
        if (targetUserId) {
          this.sendToUser(targetUserId, {
            type,
            payload: { ...payload, fromUserId: client.userId },
          });
        } else if (chatId) {
          this.broadcastToChat(chatId, {
            type,
            payload: { ...payload, fromUserId: client.userId },
          }, client.userId);
        }
        break;
      }
    }
  }

  public broadcastToChat(chatId: string, event: { type: string; payload: any }, excludeUserId?: string) {
    const chat = db.state.chats.get(chatId);
    if (!chat) return;

    for (const member of chat.members) {
      if (excludeUserId && member.userId === excludeUserId) continue;
      this.sendToUser(member.userId, event);
    }
  }

  public sendToUser(userId: string, event: { type: string; payload: any }) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const jsonStr = JSON.stringify(event);
    const textBuf = Buffer.from(jsonStr, 'utf-8');
    const binFrame = Buffer.concat([Buffer.from([0x03]), textBuf]);

    for (const client of userClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(binFrame);
      }
    }
  }

  public broadcastPresence(userId: string, isOnline: boolean) {
    const event = {
      type: 'presence_updated',
      payload: {
        userId,
        isOnline,
        lastSeen: new Date().toISOString(),
      },
    };
    const data = JSON.stringify(event);

    for (const clientSet of this.clients.values()) {
      for (const client of clientSet) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(data);
        }
      }
    }
  }

  public disconnectUser(userId: string) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;
    for (const client of userClients) {
      try {
        client.ws.close(4003, 'Account suspended');
      } catch {}
    }
    this.clients.delete(userId);
  }
}

export const wsManager = new WebSocketManager();
