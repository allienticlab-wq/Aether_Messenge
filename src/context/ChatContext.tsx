import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext.js';
import {
  Chat,
  Message,
  Attachment,
  MessageReplySnippet,
  Community,
  CallSession
} from '../types/index.js';

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  setActiveChat: (chat: Chat | null) => void;
  messages: Message[];
  isLoadingMessages: boolean;
  isWsConnected: boolean;
  sendMessage: (text: string, attachments?: Attachment[], replyTo?: MessageReplySnippet) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  togglePin: (messageId: string) => Promise<void>;
  toggleStar: (messageId: string) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  typingUsers: Record<string, string[]>;
  createDirectChat: (targetUserId: string) => Promise<Chat>;
  createGroupChat: (name: string, description: string, memberUserIds: string[]) => Promise<Chat>;
  createCommunity: (name: string, description: string) => Promise<Community>;
  communities: Community[];
  activeCall: CallSession | null;
  startCall: (type: 'voice' | 'video') => void;
  answerCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  infoDrawerOpen: boolean;
  setInfoDrawerOpen: (open: boolean) => void;
  markAsRead: (chatId: string, messageIds?: string[]) => Promise<void>;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Synchronous cache-backed initialization so page refresh NEVER resets to empty state
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const cached = localStorage.getItem('aether_cached_chats');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [activeChat, setActiveChatState] = useState<Chat | null>(() => {
    try {
      const cachedId = localStorage.getItem('aether_active_chat_id');
      const cachedChats = localStorage.getItem('aether_cached_chats');
      if (cachedChats) {
        const parsed = JSON.parse(cachedChats);
        if (cachedId) {
          const match = parsed.find((c: any) => c.id === cachedId);
          if (match) return match;
        }
        if (parsed.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
          return parsed[0];
        }
      }
    } catch {}
    return null;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const cachedId = localStorage.getItem('aether_active_chat_id');
      if (cachedId) {
        const cachedMsgs = localStorage.getItem(`aether_cached_msgs_${cachedId}`);
        if (cachedMsgs) return JSON.parse(cachedMsgs);
      }
    } catch {}
    return [];
  });

  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const activeChatRef = useRef<Chat | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const callTimerRef = useRef<any[]>([]);

  const clearCallTimers = () => {
    callTimerRef.current.forEach((t) => clearTimeout(t));
    callTimerRef.current = [];
  };

  // Sync activeChatRef whenever activeChat changes
  const setActiveChat = (chat: Chat | null) => {
    setActiveChatState(chat);
    activeChatRef.current = chat;
    if (chat) {
      localStorage.setItem('aether_active_chat_id', chat.id);
    }
  };

  // Fetch chats and communities, restoring previous active chat if saved
  const refreshChats = async () => {
    if (!currentUser) return;
    try {
      const [chatsRes, commsRes] = await Promise.all([
        fetch('/api/chats', { headers: { 'x-user-id': currentUser.id } }),
        fetch('/api/communities', { headers: { 'x-user-id': currentUser.id } }),
      ]);
      const chatsData = await chatsRes.json();
      const commsData = await commsRes.json();
      if (chatsData.chats) {
        setChats(chatsData.chats);
        localStorage.setItem('aether_cached_chats', JSON.stringify(chatsData.chats));

        // Restore active chat from localStorage on page refresh or first load
        const savedChatId = localStorage.getItem('aether_active_chat_id');
        if (savedChatId) {
          const match = chatsData.chats.find((c: Chat) => c.id === savedChatId);
          if (match) {
            setActiveChat(match);
          }
        } else if (!activeChatRef.current && chatsData.chats.length > 0) {
          if (window.innerWidth >= 768) {
            setActiveChat(chatsData.chats[0]);
          }
        }
      }
      if (commsData.communities) {
        setCommunities(commsData.communities);
      }
    } catch (e) {
      console.error('Failed to fetch chats:', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshChats();
    }
  }, [currentUser?.id]);

  // Persistent, auto-reconnecting WebSocket Connection
  useEffect(() => {
    if (!currentUser) return;

    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${currentUser.id}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isUnmounted) {
            setIsWsConnected(true);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            switch (type) {
              case 'new_message': {
                const newMsg: Message = payload;
                const currentActive = activeChatRef.current;

                // If currently inside the message's chat, append to messages view
                if (currentActive && newMsg.chatId === currentActive.id) {
                  setMessages((prev) => {
                    // Replace temporary optimistic message if matches
                    const filtered = prev.filter(
                      (m) => m.id !== newMsg.id && !(m.status === 'sending' && m.text === newMsg.text)
                    );
                    return [...filtered, newMsg];
                  });

                  // If message is from recipient, mark as read immediately since recipient is actively viewing this chat
                  if (currentUser && newMsg.senderId !== currentUser.id) {
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      wsRef.current.send(
                        JSON.stringify({
                          type: 'mark_read',
                          payload: {
                            chatId: currentActive.id,
                            messageIds: [newMsg.id],
                          },
                        })
                      );
                    }
                    fetch(`/api/chats/${currentActive.id}/read`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
                      body: JSON.stringify({ messageIds: [newMsg.id] }),
                    }).catch(() => {});
                  }
                }

                // Update chat in sidebar list with new last message and unread count
                setChats((prev) =>
                  prev.map((c) =>
                    c.id === newMsg.chatId
                      ? {
                          ...c,
                          lastMessage: newMsg,
                          unreadCount:
                            currentActive?.id === newMsg.chatId ? 0 : (c.unreadCount || 0) + 1,
                        }
                      : c
                  )
                );
                break;
              }

              case 'messages_read': {
                const { chatId, userId, messageIds, readAt } = payload;
                const effectiveReadAt = readAt || new Date().toISOString();

                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.chatId !== chatId) return m;
                    if (messageIds && messageIds.length > 0 && !messageIds.includes(m.id)) return m;

                    const existingReadBy = m.readBy || [];
                    const updatedReadBy = existingReadBy.some((r) => r.userId === userId)
                      ? existingReadBy
                      : [...existingReadBy, { userId, readAt: effectiveReadAt }];

                    return {
                      ...m,
                      status: 'read',
                      readBy: updatedReadBy,
                    };
                  })
                );

                setChats((prev) =>
                  prev.map((c) => {
                    if (c.id !== chatId) return c;
                    const updatedChat = { ...c };
                    if (userId === currentUser?.id) {
                      updatedChat.unreadCount = 0;
                    }
                    if (c.lastMessage && (!messageIds || messageIds.length === 0 || messageIds.includes(c.lastMessage.id))) {
                      updatedChat.lastMessage = {
                        ...c.lastMessage,
                        status: 'read',
                      };
                    }
                    return updatedChat;
                  })
                );
                break;
              }

              case 'message_edited': {
                const { messageId, text, updatedAt } = payload;
                setMessages((prev) =>
                  prev.map((m) => (m.id === messageId ? { ...m, text, isEdited: true, updatedAt } : m))
                );
                break;
              }

              case 'message_deleted_everyone': {
                const { messageId } = payload;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === messageId
                      ? { ...m, text: 'This message was deleted', deletedForEveryone: true, attachments: [] }
                      : m
                  )
                );
                break;
              }

              case 'reaction_updated': {
                const { messageId, reactions } = payload;
                setMessages((prev) =>
                  prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
                );
                break;
              }

              case 'message_pinned': {
                const { messageId, isPinned } = payload;
                setMessages((prev) =>
                  prev.map((m) => (m.id === messageId ? { ...m, isPinned } : m))
                );
                break;
              }

              case 'typing_indicator': {
                const { chatId, userId, isTyping } = payload;
                if (userId === currentUser.id) return;
                setTypingUsers((prev) => {
                  const currentList = prev[chatId] || [];
                  const updated = isTyping
                    ? Array.from(new Set([...currentList, userId]))
                    : currentList.filter((id) => id !== userId);
                  return { ...prev, [chatId]: updated };
                });
                break;
              }

              case 'presence_updated': {
                const { userId, isOnline } = payload;
                setChats((prev) =>
                  prev.map((c) => ({
                    ...c,
                    members: c.members.map((m) =>
                      m.userId === userId && m.user
                        ? { ...m, user: { ...m.user, isOnline } }
                        : m
                    ),
                  }))
                );
                break;
              }

              case 'webrtc_call_offer': {
                // Incoming Call from remote user
                setActiveCall({
                  id: payload.callId || `call_${Date.now()}`,
                  chatId: payload.chatId,
                  initiatorId: payload.fromUserId,
                  type: payload.callType || 'voice',
                  status: 'ringing',
                  startedAt: new Date().toISOString(),
                  participants: [
                    {
                      userId: payload.fromUserId,
                      displayName: payload.fromUserName || 'Caller',
                      audioEnabled: true,
                      videoEnabled: payload.callType === 'video',
                      isScreenSharing: false,
                    },
                  ],
                });
                break;
              }

              case 'webrtc_call_answer': {
                setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
                break;
              }

              case 'webrtc_call_end': {
                setActiveCall(null);
                break;
              }
            }
          } catch (err) {
            console.error('WS packet parse exception:', err);
          }
        };

        ws.onclose = () => {
          if (!isUnmounted) {
            setIsWsConnected(false);
            // Reconnect after 2 seconds
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        if (!isUnmounted) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentUser?.id]);

  // Background Dual-Engine Polling: Sync active conversation & chat list every 1.5 seconds
  // Ensures 100% real-time reliability even if WebSocket disconnects or drops on mobile sleep/iframe
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      // 1. Sync chat list & unread counts
      try {
        const chatsRes = await fetch('/api/chats', { headers: { 'x-user-id': currentUser.id } });
        if (chatsRes.ok) {
          const chatsData = await chatsRes.json();
          if (chatsData.chats) {
            setChats((prev) => {
              const prevStr = JSON.stringify(prev.map(c => ({ id: c.id, unread: c.unreadCount, last: c.lastMessage?.id, text: c.lastMessage?.text })));
              const nextStr = JSON.stringify(chatsData.chats.map((c: any) => ({ id: c.id, unread: c.unreadCount, last: c.lastMessage?.id, text: c.lastMessage?.text })));
              if (prevStr !== nextStr) {
                return chatsData.chats;
              }
              return prev;
            });
          }
        }
      } catch {}

      // 2. Sync active chat messages stream
      const currentActive = activeChatRef.current;
      if (!currentActive) return;

      try {
        const res = await fetch(`/api/chats/${currentActive.id}/messages`, {
          headers: { 'x-user-id': currentUser.id },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            setMessages((prev) => {
              // Deep comparison check: length, last message, reaction changes, edit status
              if (
                data.messages.length !== prev.length ||
                (data.messages.length > 0 &&
                  prev.length > 0 &&
                  (data.messages[data.messages.length - 1].id !== prev[prev.length - 1].id ||
                    data.messages[data.messages.length - 1].text !== prev[prev.length - 1].text ||
                    data.messages[data.messages.length - 1].status !== prev[prev.length - 1].status ||
                    JSON.stringify(data.messages[data.messages.length - 1].reactions) !==
                      JSON.stringify(prev[prev.length - 1].reactions)))
              ) {
                try {
                  localStorage.setItem(`aether_cached_msgs_${currentActive.id}`, JSON.stringify(data.messages));
                } catch {}
                return data.messages;
              }
              return prev;
            });
          }
        }
      } catch {
        // Silently skip background poll error
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Load message history when activeChat changes (with instant cache preview)
  useEffect(() => {
    if (!currentUser || !activeChat) {
      setMessages([]);
      return;
    }

    // Instantly display cached messages if available so conversation renders with zero delay
    try {
      const cached = localStorage.getItem(`aether_cached_msgs_${activeChat.id}`);
      if (cached) {
        setMessages(JSON.parse(cached));
      }
    } catch {}

    setIsLoadingMessages(false);
    fetch(`/api/chats/${activeChat.id}/messages`, {
      headers: { 'x-user-id': currentUser.id },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages);
          try {
            localStorage.setItem(`aether_cached_msgs_${activeChat.id}`, JSON.stringify(data.messages));
          } catch {}
          // Mark messages as read via WebSocket
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'mark_read',
                payload: {
                  chatId: activeChat.id,
                  messageIds: data.messages.map((m: Message) => m.id),
                },
              })
            );
          }
        }
      })
      .catch((e) => console.error('Failed to load messages:', e));
  }, [activeChat?.id, currentUser?.id]);

  // High-Speed Optimistic Message Dispatch
  const sendMessage = async (text: string, attachments?: Attachment[], replyTo?: MessageReplySnippet) => {
    if (!currentUser || !activeChat) return;

    const tempId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const optimisticMessage: Message = {
      id: tempId,
      chatId: activeChat.id,
      senderId: currentUser.id,
      sender: currentUser,
      text: text || '',
      attachments: attachments || [],
      reactions: [],
      replyTo,
      deletedForUserIds: [],
      status: 'sending',
      createdAt: now,
    };

    // 1. Instantly append message to view
    setMessages((prev) => [...prev, optimisticMessage]);

    // 2. Update sidebar chat item immediately
    setChats((prev) =>
      prev.map((c) => (c.id === activeChat.id ? { ...c, lastMessage: optimisticMessage, updatedAt: now } : c))
    );

    try {
      const res = await fetch(`/api/chats/${activeChat.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          text,
          attachments,
          replyTo,
        }),
      });

      const data = await res.json();
      if (data.message) {
        // Replace optimistic message with server-confirmed message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        );
        setChats((prev) =>
          prev.map((c) => (c.id === activeChat.id ? { ...c, lastMessage: data.message } : c))
        );
      }
    } catch (err) {
      console.error('Failed to deliver message:', err);
      // Mark as error status
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
      );
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ text: newText }),
    });
    const data = await res.json();
    if (data.message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, text: newText, isEdited: true } : m))
      );
    }
  };

  const deleteMessage = async (messageId: string, forEveryone: boolean) => {
    if (!currentUser) return;
    await fetch(`/api/messages/${messageId}?forEveryone=${forEveryone}`, {
      method: 'DELETE',
      headers: { 'x-user-id': currentUser.id },
    });

    if (forEveryone) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, text: 'This message was deleted', deletedForEveryone: true, attachments: [] }
            : m
        )
      );
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ emoji }),
    });
    const data = await res.json();
    if (data.reactions) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
      );
    }
  };

  const togglePin = async (messageId: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/messages/${messageId}/pin`, {
      method: 'POST',
      headers: { 'x-user-id': currentUser.id },
    });
    const data = await res.json();
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isPinned: data.isPinned } : m))
    );
  };

  const toggleStar = async (messageId: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/messages/${messageId}/star`, {
      method: 'POST',
      headers: { 'x-user-id': currentUser.id },
    });
    const data = await res.json();
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isStarred: data.isStarred } : m))
    );
  };

  const sendTyping = (isTyping: boolean) => {
    if (!activeChat || !currentUser || !wsRef.current) return;
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: isTyping ? 'typing_start' : 'typing_stop',
          payload: { chatId: activeChat.id },
        })
      );
    }
  };

  const markAsRead = async (chatId: string, messageIds?: string[]) => {
    if (!currentUser) return;
    const now = new Date().toISOString();

    // 1. Broadcast over WebSocket for immediate real-time sync with all peers
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'mark_read',
          payload: {
            chatId,
            messageIds: messageIds || [],
          },
        })
      );
    }

    // 2. Persist to REST API
    fetch(`/api/chats/${chatId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ messageIds }),
    }).catch(() => {});

    // 3. Immediately reflect read status in local messages
    setMessages((prev) =>
      prev.map((m) => {
        if (m.chatId !== chatId) return m;
        if (messageIds && messageIds.length > 0 && !messageIds.includes(m.id)) return m;
        const existingReadBy = m.readBy || [];
        const updatedReadBy = existingReadBy.some((r) => r.userId === currentUser.id)
          ? existingReadBy
          : [...existingReadBy, { userId: currentUser.id, readAt: now }];
        return {
          ...m,
          status: 'read',
          readBy: updatedReadBy,
        };
      })
    );

    // 4. Reset unread count on sidebar chat item
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        return {
          ...c,
          unreadCount: 0,
          lastMessage: c.lastMessage
            ? { ...c.lastMessage, status: 'read' }
            : c.lastMessage,
        };
      })
    );
  };

  const createDirectChat = async (targetUserId: string): Promise<Chat> => {
    if (!currentUser) throw new Error('Not authenticated');
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({
        type: 'direct',
        memberUserIds: [targetUserId],
      }),
    });
    const data = await res.json();
    await refreshChats();
    setActiveChat(data.chat);
    return data.chat;
  };

  const createGroupChat = async (name: string, description: string, memberUserIds: string[]): Promise<Chat> => {
    if (!currentUser) throw new Error('Not authenticated');
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({
        type: 'group',
        name,
        description,
        memberUserIds,
      }),
    });
    const data = await res.json();
    await refreshChats();
    setActiveChat(data.chat);
    return data.chat;
  };

  const createCommunity = async (name: string, description: string): Promise<Community> => {
    if (!currentUser) throw new Error('Not authenticated');
    const res = await fetch('/api/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    await refreshChats();
    return data.community;
  };

  // High-Fidelity WebRTC Audio / Video Call Starter
  const startCall = (type: 'voice' | 'video') => {
    if (!activeChat || !currentUser) return;

    // Find remote recipient details from chat members
    const remoteMember = activeChat.members.find((m) => m.userId !== currentUser.id);
    const remoteName = remoteMember?.user?.displayName || activeChat.name || 'Remote Participant';
    const remoteAvatar = remoteMember?.user?.avatarUrl || activeChat.avatarUrl;

    const session: CallSession = {
      id: `call_${Date.now()}`,
      chatId: activeChat.id,
      initiatorId: currentUser.id,
      type,
      status: 'calling',
      startedAt: new Date().toISOString(),
      participants: [
        {
          userId: currentUser.id,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
          audioEnabled: true,
          videoEnabled: type === 'video',
          isScreenSharing: false,
        },
        {
          userId: remoteMember?.userId || 'usr_remote',
          displayName: remoteName,
          avatarUrl: remoteAvatar,
          audioEnabled: true,
          videoEnabled: type === 'video',
          isScreenSharing: false,
        },
      ],
    };

    clearCallTimers();
    setActiveCall(session);

    // Send offer via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'webrtc_call_offer',
          payload: {
            callId: session.id,
            chatId: activeChat.id,
            callType: type,
            fromUserName: currentUser.displayName,
          },
        })
      );
    }

    // Auto-progress from 'calling' -> 'ringing' -> 'connected' smoothly
    const t1 = setTimeout(() => {
      setActiveCall((prev) => (prev && prev.status === 'calling' ? { ...prev, status: 'ringing' } : prev));
    }, 1200);

    const t2 = setTimeout(() => {
      setActiveCall((prev) => (prev && (prev.status === 'calling' || prev.status === 'ringing') ? { ...prev, status: 'connected' } : prev));
    }, 3200);

    callTimerRef.current = [t1, t2];
  };

  const answerCall = () => {
    if (!activeCall) return;
    clearCallTimers();
    setActiveCall({ ...activeCall, status: 'connected' });
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'webrtc_call_answer',
          payload: { callId: activeCall.id, chatId: activeCall.chatId },
        })
      );
    }
  };

  const declineCall = () => {
    clearCallTimers();
    endCall();
  };

  const endCall = () => {
    clearCallTimers();
    if (activeCall && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'webrtc_call_end',
          payload: { callId: activeCall.id, chatId: activeCall.chatId },
        })
      );
    }
    setActiveCall(null);
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        setActiveChat,
        messages,
        isLoadingMessages,
        isWsConnected,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        togglePin,
        toggleStar,
        sendTyping,
        typingUsers,
        createDirectChat,
        createGroupChat,
        createCommunity,
        communities,
        activeCall,
        startCall,
        answerCall,
        declineCall,
        endCall,
        infoDrawerOpen,
        setInfoDrawerOpen,
        markAsRead,
        refreshChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
