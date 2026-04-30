import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ChatUser = {
  _id: number;
  name: string;
};

export type ChatMessage = {
  _id: string;
  text: string;
  createdAt: Date;
  user: ChatUser;
};

type ChatContextType = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  clearChat: () => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <ChatContext.Provider value={{ messages, setMessages, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
