"use client";

import { useRef, useEffect } from "react";
import { MessageBubble } from "@/components/MessageBubble";
import { useChatStore } from "@/store/useChatStore";
import type { TurnType } from "@/types/ai";

interface ChatMessagesProps {
  conversationId: string;
  tutorAvatarUrl?: string;
  tutorDisplayName?: string;
}

export function ChatMessages({
  conversationId,
  tutorAvatarUrl,
  tutorDisplayName,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { turns, isStreaming, streamingText, streamingTurnType } =
    useChatStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isStreaming, streamingText]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {turns.map((turn) => (
        <MessageBubble
          key={turn.id}
          turn={turn}
          turnType={
            turn.role === "assistant"
              ? ((turn.tool as { type?: string })?.type as TurnType | undefined)
              : undefined
          }
          tutorAvatarUrl={tutorAvatarUrl}
          tutorDisplayName={tutorDisplayName}
        />
      ))}
      {isStreaming && (
        <MessageBubble
          turn={{
            id: "streaming",
            conversationId,
            role: "assistant",
            text: streamingText || "...",
            latex: null,
            tool: null,
            createdAt: new Date(),
          }}
          turnType={streamingTurnType}
          isStreaming={true}
          streamingText={streamingText}
          tutorAvatarUrl={tutorAvatarUrl}
          tutorDisplayName={tutorDisplayName}
        />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

