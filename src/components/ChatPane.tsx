"use client";

import { useState, useRef, useEffect } from "react";
import type { Turn } from "@/server/db/turns";
import type { TurnType } from "@/types/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "@/components/MessageBubble";
import { useChatStore } from "@/store/useChatStore";
import { api } from "@/trpc/react";
import { Send } from "lucide-react";

interface ChatPaneProps {
  conversationId: string;
}

export function ChatPane({ conversationId }: ChatPaneProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    turns,
    setTurns,
    isStreaming,
    streamingText,
    streamingTurnType,
    setStreaming,
    appendStreamingText,
    setStreamingTurnType,
    finalizeStreaming,
    clearStreaming,
  } = useChatStore();

  // Load turns on mount
  const { data: loadedTurns, isLoading } = api.conversations.getTurns.useQuery(
    { conversationId },
    { enabled: !!conversationId },
  );

  useEffect(() => {
    if (loadedTurns) {
      setTurns(loadedTurns);
    }
  }, [loadedTurns, setTurns]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isStreaming, streamingText]);

  const utils = api.useUtils();
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [subscriptionInput, setSubscriptionInput] = useState<{
    conversationId: string;
    userText: string;
  } | null>(null);

  // Set up subscription at component level (hooks must be at top level)
  api.ai.tutorTurn.useSubscription(
    subscriptionInput ?? { conversationId: "", userText: "" },
    {
      enabled: subscriptionEnabled && !!subscriptionInput,
      onData: (data) => {
        if (data.type === "text" && data.content) {
          appendStreamingText(data.content);
        } else if (data.type === "done") {
          // Create a turn object from the done message
          if (data.turnId && data.fullText !== undefined) {
            const turn: Turn = {
              id: data.turnId,
              conversationId,
              role: "assistant",
              text: data.fullText,
              latex: data.latex ?? null,
              tool: data.turnType ? { type: data.turnType } : null,
              createdAt: new Date(),
            };
            finalizeStreaming(turn);
            // Invalidate turns query to refresh
            void utils.conversations.getTurns.invalidate({ conversationId });
          }
          // Disable subscription after completion
          setSubscriptionEnabled(false);
          setSubscriptionInput(null);
        }
      },
      onError: (error) => {
        console.error("Streaming error:", error);
        clearStreaming();
        setSubscriptionEnabled(false);
        setSubscriptionInput(null);
      },
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || isStreaming) return;

    const userText = input.trim();
    setInput("");

    // Create user turn immediately (optimistic update)
    const userTurn: Turn = {
      id: crypto.randomUUID(), // Temporary ID
      conversationId,
      role: "user",
      text: userText,
      latex: null,
      tool: null,
      createdAt: new Date(),
    };
    setTurns([...turns, userTurn]);

    // Start streaming
    setStreaming(true);
    setStreamingTurnType(null);

    // Trigger subscription
    setSubscriptionInput({ conversationId, userText });
    setSubscriptionEnabled(true);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading && (
          <div className="text-muted-foreground text-center">
            Loading conversation...
          </div>
        )}
        {turns.map((turn) => (
          <MessageBubble
            key={turn.id}
            turn={turn}
            turnType={
              turn.role === "assistant"
                ? ((turn.tool as { type?: string })?.type as
                    | TurnType
                    | undefined)
                : undefined
            }
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
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or math problem..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={!input.trim() || isStreaming}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
