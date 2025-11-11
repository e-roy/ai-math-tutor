"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import type { EphemeralChatPaneRef } from "./EphemeralChatPane";

interface ChatContextValue {
  chatRef: React.RefObject<EphemeralChatPaneRef | null>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const chatRef = useRef<EphemeralChatPaneRef | null>(null);

  return (
    <ChatContext.Provider value={{ chatRef }}>{children}</ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
}
