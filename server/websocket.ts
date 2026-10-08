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
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');
      const sessionId = url.searchParams.get('sessionId') || 'default_session';

      if (!userId || !db.getUserById(userId)) {
        ws.close(4001, 'Unauthorized');
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
      const user = db.getUserById(userId);
      if (user) {
        user.isOnline = true;
        user.lastSeen = new Date().toISOString();
        this.broadcastPresence(userId, true);
      }

      // Heartbeat ping-pong
      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const payload = JSON.parse(data.toString());
          this.handleClientMessage(client, payload);
        } catch {
          // malformed packet
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
        if (Array.isArray(messageIds)) {
          for (const mid of messageIds) {
            const m = db.state.messages.get(mid);
            if (m && m.chatId === chatId) {
              m.status = 'read';
              if (!m.readBy) m.readBy = [];
              if (!m.readBy.some(r => r.userId === client.userId)) {
                m.readBy.push({ userId: client.userId, readAt: now });
              }
            }
          }
        }
        this.broadcastToChat(chatId, {
          type: 'messages_read',
          payload: { chatId, userId: client.userId, messageIds, readAt: now },
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

    const data = JSON.stringify(event);
    for (const client of userClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
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
}

export const wsManager = new WebSocketManager();
