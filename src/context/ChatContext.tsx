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
  endCall: () => void;
  infoDrawerOpen: boolean;
  setInfoDrawerOpen: (open: boolean) => void;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch chats and communities
  const refreshChats = async () => {
    if (!currentUser) return;
    try {
      const [chatsRes, commsRes] = await Promise.all([
        fetch('/api/chats', { headers: { 'x-user-id': currentUser.id } }),
        fetch('/api/communities', { headers: { 'x-user-id': currentUser.id } }),
      ]);
      const chatsData = await chatsRes.json();
      const commsData = await commsRes.json();
      if (chatsData.chats) setChats(chatsData.chats);
      if (commsData.communities) setCommunities(commsData.communities);

      // Auto-select first chat on large screens if none selected
      if (!activeChat && chatsData.chats && chatsData.chats.length > 0 && window.innerWidth >= 1024) {
        setActiveChat(chatsData.chats[0]);
      }
    } catch (e) {
      console.error('Failed to fetch chats:', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshChats();
    } else {
      setChats([]);
      setActiveChat(null);
      setMessages([]);
    }
  }, [currentUser]);

  // WebSocket Connection
  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${currentUser.id}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;

        switch (type) {
          case 'new_message': {
            const newMsg: Message = payload;
            setMessages((prev) => {
              if (activeChat && newMsg.chatId === activeChat.id) {
                // Avoid duplicates
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              }
              return prev;
            });
            // Update lastMessage on chat in list
            setChats((prev) =>
              prev.map((c) =>
                c.id === newMsg.chatId
                  ? {
                      ...c,
                      lastMessage: newMsg,
                      unreadCount: activeChat?.id === newMsg.chatId ? 0 : c.unreadCount + 1,
                    }
                  : c
              )
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
            if (currentUser && userId === currentUser.id) return;
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
            // Incoming Call
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

          case 'webrtc_call_end': {
            setActiveCall(null);
            break;
          }
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [currentUser, activeChat?.id]);

  // Load message history when activeChat changes
  useEffect(() => {
    if (!currentUser || !activeChat) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    fetch(`/api/chats/${activeChat.id}/messages`, {
      headers: { 'x-user-id': currentUser.id },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages);
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
      .catch((e) => console.error('Failed to load messages:', e))
      .finally(() => setIsLoadingMessages(false));
  }, [activeChat?.id, currentUser?.id]);

  const sendMessage = async (text: string, attachments?: Attachment[], replyTo?: MessageReplySnippet) => {
    if (!currentUser || !activeChat) return;

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
      setMessages((prev) => [...prev, data.message]);
      setChats((prev) =>
        prev.map((c) => (c.id === activeChat.id ? { ...c, lastMessage: data.message } : c))
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
          m.id === messageId ? { ...m, text: 'This message was deleted', deletedForEveryone: true } : m
        )
      );
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/messages/${messageId}/reaction`, {
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
    if (!activeChat || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: isTyping ? 'typing_start' : 'typing_stop',
        payload: { chatId: activeChat.id },
      })
    );
  };

  const createDirectChat = async (targetUserId: string): Promise<Chat> => {
    if (!currentUser) throw new Error('Not logged in');
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
    if (!currentUser) throw new Error('Not logged in');
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
    if (!currentUser) throw new Error('Not logged in');
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

  const startCall = (type: 'voice' | 'video') => {
    if (!activeChat || !currentUser) return;
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
      ],
    };
    setActiveCall(session);

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
  };

  const endCall = () => {
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
        endCall,
        infoDrawerOpen,
        setInfoDrawerOpen,
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
