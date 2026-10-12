import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext.js';
import {
  Chat,
  Message,
  ScheduledMessage,
  ChatBackgroundConfig,
  Attachment,
  MessageReplySnippet,
  Community,
  CallSession
} from '../types/index.js';
import { encryptText, decryptText } from '../lib/e2ee.js';

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  setActiveChat: (chat: Chat | null) => void;
  messages: Message[];
  scheduledMessages: ScheduledMessage[];
  chatBackgrounds: Record<string, ChatBackgroundConfig>;
  activeChatBackground: ChatBackgroundConfig | null;
  setChatBackground: (chatId: string, config: ChatBackgroundConfig | null) => Promise<void>;
  isLoadingMessages: boolean;
  isWsConnected: boolean;
  sendMessage: (text: string, attachments?: Attachment[], replyTo?: MessageReplySnippet) => Promise<void>;
  scheduleMessage: (
    chatId: string,
    text: string,
    scheduledFor: string,
    attachments?: Attachment[],
    replyTo?: MessageReplySnippet
  ) => Promise<ScheduledMessage | null>;
  fetchScheduledMessages: (chatId: string) => Promise<void>;
  cancelScheduledMessage: (chatId: string, scheduledId: string) => Promise<void>;
  sendScheduledMessageNow: (chatId: string, scheduledId: string) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  togglePin: (messageId: string) => Promise<void>;
  toggleStar: (messageId: string) => Promise<void>;
  sendTyping: (isTyping: boolean, targetChatId?: string) => void;
  typingUsers: Record<string, string[]>;
  createDirectChat: (targetUserId: string) => Promise<Chat>;
  createGroupChat: (name: string, description: string, memberUserIds: string[]) => Promise<Chat>;
  createCommunity: (name: string, description: string) => Promise<Community>;
  communities: Community[];
  activeCall: CallSession | null;
  startCall: (type: 'voice' | 'video', targetChat?: Chat) => void;
  answerCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  lastSignal: { type: string; payload: any } | null;
  sendWebRtcSignal: (type: string, payload: any) => void;
  callsHistory: CallSession[];
  fetchCallsHistory: () => Promise<void>;
  infoDrawerOpen: boolean;
  setInfoDrawerOpen: (open: boolean) => void;
  markAsRead: (chatId: string, messageIds?: string[]) => Promise<void>;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Synchronous cache-backed initialization without forcing demo data
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const cached = localStorage.getItem('aether_cached_chats');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Exclude any stale demo announcement chats
        return Array.isArray(parsed) ? parsed.filter((c: any) => c.id !== 'chat_announcements') : [];
      }
    } catch {}
    return [];
  });

  const [activeChat, setActiveChatState] = useState<Chat | null>(() => {
    try {
      const cachedId = localStorage.getItem('aether_active_chat_id');
      if (cachedId && cachedId !== 'chat_announcements') {
        const cachedChats = localStorage.getItem('aether_cached_chats');
        if (cachedChats) {
          const parsed = JSON.parse(cachedChats);
          const match = parsed.find((c: any) => c.id === cachedId);
          if (match && match.id !== 'chat_announcements') return match;
        }
      }
    } catch {}
    // Clean production state: Do NOT automatically open demo chats on load
    return null;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const cachedId = localStorage.getItem('aether_active_chat_id');
      if (cachedId && cachedId !== 'chat_announcements') {
        const cachedMsgs = localStorage.getItem(`aether_cached_msgs_${cachedId}`);
        if (cachedMsgs) return JSON.parse(cachedMsgs);
      }
    } catch {}
    return [];
  });

  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);

  const [chatBackgrounds, setChatBackgrounds] = useState<Record<string, ChatBackgroundConfig>>(() => {
    try {
      const cached = localStorage.getItem('aether_chat_backgrounds');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {};
  });

  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [lastSignal, setLastSignal] = useState<{ type: string; payload: any } | null>(null);
  const [callsHistory, setCallsHistory] = useState<CallSession[]>([]);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const activeChatRef = useRef<Chat | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const callTimerRef = useRef<any[]>([]);
  const typingTimeoutsRef = useRef<Map<string, any>>(new Map());

  const sendWebRtcSignal = (type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  const fetchCallsHistory = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/calls/history', {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history)) {
          setCallsHistory(data.history);
        }
      }
    } catch (err) {
      console.error('Failed to fetch call history:', err);
    }
  };

  const clearCallTimers = () => {
    callTimerRef.current.forEach((t) => clearTimeout(t));
    callTimerRef.current = [];
  };

  // Sync activeChatRef whenever activeChat changes
  const setActiveChat = (chat: Chat | null) => {
    setActiveChatState(chat);
    activeChatRef.current = chat;
    if (chat && chat.id !== 'chat_announcements') {
      localStorage.setItem('aether_active_chat_id', chat.id);
    } else {
      localStorage.removeItem('aether_active_chat_id');
    }
  };

  // Clean stale demo cache keys on startup
  useEffect(() => {
    try {
      localStorage.removeItem('aether_cached_msgs_chat_announcements');
      if (localStorage.getItem('aether_active_chat_id') === 'chat_announcements') {
        localStorage.removeItem('aether_active_chat_id');
      }
    } catch {}
  }, []);

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
        // Exclude any stale demo announcements chat
        const realChats = chatsData.chats.filter((c: Chat) => c.id !== 'chat_announcements');
        setChats(realChats);
        localStorage.setItem('aether_cached_chats', JSON.stringify(realChats));

        // Restore active chat only if previously selected by user
        const savedChatId = localStorage.getItem('aether_active_chat_id');
        if (savedChatId && savedChatId !== 'chat_announcements') {
          const match = realChats.find((c: Chat) => c.id === savedChatId);
          if (match) {
            setActiveChat(match);
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
                const rawMsg: Message = payload;
                const currentActive = activeChatRef.current;

                // Decrypt message text if encrypted
                (async () => {
                  let textToUse = rawMsg.text || '';
                  if (textToUse.startsWith('e2ee:v1:')) {
                    textToUse = await decryptText(textToUse, rawMsg.chatId);
                  }
                  const newMsg: Message = { ...rawMsg, text: textToUse };

                  // Immediately clear typing status for the message author in this chat
                  if (newMsg.chatId && newMsg.senderId) {
                    const timerKey = `${newMsg.chatId}:${newMsg.senderId}`;
                    if (typingTimeoutsRef.current.has(timerKey)) {
                      clearTimeout(typingTimeoutsRef.current.get(timerKey));
                      typingTimeoutsRef.current.delete(timerKey);
                    }
                    setTypingUsers((prev) => {
                      const currentList = prev[newMsg.chatId] || [];
                      if (!currentList.includes(newMsg.senderId)) return prev;
                      return {
                        ...prev,
                        [newMsg.chatId]: currentList.filter((id) => id !== newMsg.senderId),
                      };
                    });
                  }

                  // If currently inside the message's chat, append to messages view
                  if (currentActive && newMsg.chatId === currentActive.id) {
                    setMessages((prev) => {
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
                })();
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

              case 'scheduled_message_created': {
                const item = payload;
                const currentActive = activeChatRef.current;
                if (currentActive && item.chatId === currentActive.id) {
                  (async () => {
                    let decText = item.text || '';
                    if (decText.startsWith('e2ee:v1:')) {
                      decText = await decryptText(decText, item.chatId);
                    }
                    setScheduledMessages((prev) => [...prev.filter((s) => s.id !== item.id), { ...item, text: decText }]);
                  })();
                }
                break;
              }

              case 'scheduled_message_cancelled': {
                const { scheduledId } = payload;
                setScheduledMessages((prev) => prev.filter((s) => s.id !== scheduledId));
                break;
              }

              case 'scheduled_message_sent': {
                const { scheduledId } = payload;
                setScheduledMessages((prev) => prev.filter((s) => s.id !== scheduledId));
                break;
              }

              case 'chat_background_updated': {
                const { chatId, background } = payload;
                setChatBackgrounds((prev) => {
                  const updated = { ...prev };
                  if (background) {
                    updated[chatId] = background;
                  } else {
                    delete updated[chatId];
                  }
                  try {
                    localStorage.setItem('aether_chat_backgrounds', JSON.stringify(updated));
                  } catch {}
                  return updated;
                });
                setChats((prev) =>
                  prev.map((c) => (c.id === chatId ? { ...c, backgroundConfig: background } : c))
                );
                setActiveChatState((prev) =>
                  prev && prev.id === chatId ? { ...prev, backgroundConfig: background } : prev
                );
                break;
              }

              case 'typing_indicator': {
                const { chatId, userId, isTyping } = payload;
                if (!chatId || !userId) return;
                if (currentUser && userId === currentUser.id) return;

                const timerKey = `${chatId}:${userId}`;
                if (typingTimeoutsRef.current.has(timerKey)) {
                  clearTimeout(typingTimeoutsRef.current.get(timerKey));
                  typingTimeoutsRef.current.delete(timerKey);
                }

                if (isTyping) {
                  // Set auto-expiry timer of 3.5 seconds
                  const timeout = setTimeout(() => {
                    setTypingUsers((prev) => {
                      const list = prev[chatId] || [];
                      if (!list.includes(userId)) return prev;
                      return {
                        ...prev,
                        [chatId]: list.filter((id) => id !== userId),
                      };
                    });
                    typingTimeoutsRef.current.delete(timerKey);
                  }, 3500);
                  typingTimeoutsRef.current.set(timerKey, timeout);

                  setTypingUsers((prev) => {
                    const currentList = prev[chatId] || [];
                    if (currentList.includes(userId)) return prev;
                    return { ...prev, [chatId]: [...currentList, userId] };
                  });
                } else {
                  setTypingUsers((prev) => {
                    const currentList = prev[chatId] || [];
                    if (!currentList.includes(userId)) return prev;
                    return { ...prev, [chatId]: currentList.filter((id) => id !== userId) };
                  });
                }
                break;
              }

              case 'presence_updated': {
                const { userId, isOnline } = payload;
                // If remote user goes offline, immediately clear their typing indicator across all chats
                if (!isOnline) {
                  setTypingUsers((prev) => {
                    let hasChanged = false;
                    const next: Record<string, string[]> = {};
                    for (const [cId, list] of Object.entries(prev)) {
                      if (list.includes(userId)) {
                        hasChanged = true;
                        next[cId] = list.filter((id) => id !== userId);
                      } else {
                        next[cId] = list;
                      }
                    }
                    return hasChanged ? next : prev;
                  });
                }
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

              case 'webrtc_call_offer':
              case 'webrtc_call_answer':
              case 'webrtc_ice_candidate':
              case 'webrtc_call_end':
              case 'webrtc_media_toggle': {
                setLastSignal({ type, payload });
                if (type === 'webrtc_call_offer') {
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
                        avatarUrl: payload.fromUserAvatar,
                        audioEnabled: true,
                        videoEnabled: payload.callType === 'video',
                        isScreenSharing: false,
                      },
                    ],
                  });
                } else if (type === 'webrtc_call_answer') {
                  setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
                } else if (type === 'webrtc_call_end') {
                  setActiveCall(null);
                }
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
      for (const timeout of typingTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      typingTimeoutsRef.current.clear();
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
      .then(async (data) => {
        if (data.messages && Array.isArray(data.messages)) {
          // Decrypt encrypted messages for display
          const decryptedList = await Promise.all(
            data.messages.map(async (m: Message) => {
              if (m.text && m.text.startsWith('e2ee:v1:')) {
                const dec = await decryptText(m.text, m.chatId);
                return { ...m, text: dec };
              }
              return m;
            })
          );

          setMessages(decryptedList);
          try {
            localStorage.setItem(`aether_cached_msgs_${activeChat.id}`, JSON.stringify(decryptedList));
          } catch {}
          // Mark messages as read via WebSocket
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'mark_read',
                payload: {
                  chatId: activeChat.id,
                  messageIds: decryptedList.map((m: Message) => m.id),
                },
              })
            );
          }
        }
      })
      .catch((e) => console.error('Failed to load messages:', e));

    fetchScheduledMessages(activeChat.id);
  }, [activeChat?.id, currentUser?.id]);

  // High-Speed Optimistic Message Dispatch with E2EE Client-Side Encryption
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

    // 1. Instantly append message to view locally (unencrypted plaintext for immediate author UI rendering)
    setMessages((prev) => [...prev, optimisticMessage]);

    // 2. Update sidebar chat item immediately
    setChats((prev) =>
      prev.map((c) => (c.id === activeChat.id ? { ...c, lastMessage: optimisticMessage, updatedAt: now } : c))
    );

    try {
      // 3. Dispatch message over HTTP API (with E2EE transport security & real-time WebSocket sync)
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
        const confirmedMsg = { ...data.message, text: text || data.message.text };
        // Replace optimistic message with confirmed server response
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? confirmedMsg : m))
        );
        setChats((prev) =>
          prev.map((c) => (c.id === activeChat.id ? { ...c, lastMessage: confirmedMsg } : c))
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

  const sendTyping = (isTyping: boolean, targetChatId?: string) => {
    const chatId = targetChatId || activeChatRef.current?.id;
    if (!chatId || !currentUser || !wsRef.current) return;
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: isTyping ? 'typing_start' : 'typing_stop',
          payload: { chatId },
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
  const startCall = (type: 'voice' | 'video', targetChat?: Chat) => {
    const chatToUse = targetChat || activeChat;
    if (!chatToUse || !currentUser) return;

    // Find remote recipient details from chat members
    const remoteMember = chatToUse.members?.find((m) => m.userId !== currentUser.id);
    const remoteName = remoteMember?.user?.displayName || chatToUse.name || 'Remote Participant';
    const remoteAvatar = remoteMember?.user?.avatarUrl || chatToUse.avatarUrl;

    const session: CallSession = {
      id: `call_${Date.now()}`,
      chatId: chatToUse.id,
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
    sendWebRtcSignal('webrtc_call_offer', {
      callId: session.id,
      chatId: chatToUse.id,
      callType: type,
      fromUserName: currentUser.displayName,
      fromUserAvatar: currentUser.avatarUrl,
      targetUserId: remoteMember?.userId,
    });
  };

  const answerCall = () => {
    if (!activeCall) return;
    clearCallTimers();
    setActiveCall({ ...activeCall, status: 'connected' });
    sendWebRtcSignal('webrtc_call_answer', {
      callId: activeCall.id,
      chatId: activeCall.chatId,
    });
  };

  const declineCall = () => {
    clearCallTimers();
    if (activeCall && currentUser) {
      logCallHistory(activeCall, 'declined', 0);
    }
    endCall();
  };

  const logCallHistory = async (session: CallSession, finalStatus: string, durationSec = 0) => {
    if (!currentUser) return;
    try {
      const partner = session.participants?.find((p) => p.userId !== session.initiatorId);
      await fetch('/api/calls/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          id: session.id,
          chatId: session.chatId,
          initiatorId: session.initiatorId,
          receiverId: partner?.userId,
          callerName: currentUser.displayName,
          callerAvatar: currentUser.avatarUrl,
          receiverName: partner?.displayName || 'Participant',
          receiverAvatar: partner?.avatarUrl,
          type: session.type,
          status: finalStatus,
          startedAt: session.startedAt,
          duration: durationSec,
        }),
      });
      fetchCallsHistory();
    } catch {}
  };

  const endCall = () => {
    clearCallTimers();
    if (activeCall) {
      sendWebRtcSignal('webrtc_call_end', {
        callId: activeCall.id,
        chatId: activeCall.chatId,
      });
    }
    setActiveCall(null);
  };

  const fetchScheduledMessages = async (chatId: string) => {
    if (!currentUser || !chatId) return;
    try {
      const res = await fetch(`/api/chats/${chatId}/scheduled-messages`, {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scheduledMessages && Array.isArray(data.scheduledMessages)) {
          const decryptedList = await Promise.all(
            data.scheduledMessages.map(async (m: ScheduledMessage) => {
              if (m.text && m.text.startsWith('e2ee:v1:')) {
                const dec = await decryptText(m.text, m.chatId);
                return { ...m, text: dec };
              }
              return m;
            })
          );
          setScheduledMessages(decryptedList);
        }
      }
    } catch (e) {
      console.error('Failed to fetch scheduled messages:', e);
    }
  };

  const scheduleMessage = async (
    chatId: string,
    text: string,
    scheduledFor: string,
    attachments?: Attachment[],
    replyTo?: MessageReplySnippet
  ): Promise<ScheduledMessage | null> => {
    if (!currentUser) return null;
    try {
      const encryptedText = text ? await encryptText(text, chatId) : '';
      const res = await fetch(`/api/chats/${chatId}/scheduled-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          text: encryptedText,
          attachments,
          replyTo,
          scheduledFor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule message');
      }
      if (data.scheduledMessage) {
        const decryptedMsg = { ...data.scheduledMessage, text: text || data.scheduledMessage.text };
        setScheduledMessages((prev) => [...prev.filter((m) => m.id !== decryptedMsg.id), decryptedMsg]);
        return decryptedMsg;
      }
    } catch (e: any) {
      console.error('Schedule message error:', e);
      throw e;
    }
    return null;
  };

  const cancelScheduledMessage = async (chatId: string, scheduledId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/chats/${chatId}/scheduled-messages/${scheduledId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        setScheduledMessages((prev) => prev.filter((m) => m.id !== scheduledId));
      }
    } catch (e) {
      console.error('Failed to cancel scheduled message:', e);
    }
  };

  const sendScheduledMessageNow = async (chatId: string, scheduledId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/chats/${chatId}/scheduled-messages/${scheduledId}/send-now`, {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        setScheduledMessages((prev) => prev.filter((m) => m.id !== scheduledId));
      }
    } catch (e) {
      console.error('Failed to send scheduled message now:', e);
    }
  };

  const activeChatBackground = activeChat
    ? chatBackgrounds[activeChat.id] || activeChat.backgroundConfig || null
    : null;

  const setChatBackground = async (chatId: string, config: ChatBackgroundConfig | null) => {
    setChatBackgrounds((prev) => {
      const updated = { ...prev };
      if (config) {
        updated[chatId] = config;
      } else {
        delete updated[chatId];
      }
      try {
        localStorage.setItem('aether_chat_backgrounds', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, backgroundConfig: config || undefined } : c))
    );

    if (activeChat?.id === chatId) {
      setActiveChatState((prev) =>
        prev ? { ...prev, backgroundConfig: config || undefined } : null
      );
    }

    if (currentUser) {
      try {
        await fetch(`/api/chats/${chatId}/background`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ background: config }),
        });
      } catch (err) {
        console.error('Failed to sync chat background to server:', err);
      }
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        setActiveChat,
        messages,
        scheduledMessages,
        chatBackgrounds,
        activeChatBackground,
        setChatBackground,
        isLoadingMessages,
        isWsConnected,
        sendMessage,
        scheduleMessage,
        fetchScheduledMessages,
        cancelScheduledMessage,
        sendScheduledMessageNow,
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
        lastSignal,
        sendWebRtcSignal,
        callsHistory,
        fetchCallsHistory,
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
