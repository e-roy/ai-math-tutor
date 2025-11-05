"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Turn } from "@/server/db/turns";
import type { TurnType } from "@/types/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "@/components/MessageBubble";
import { MathAnswerBox } from "@/components/MathAnswerBox";
import { api } from "@/trpc/react";
import { Send } from "lucide-react";

interface EphemeralChatPaneProps {
  conversationId: string;
  onHintUsed?: () => void;
  onAttempt?: () => void;
  onTurnsChange?: (turns: Turn[]) => void;
}

/**
 * EphemeralChatPane component for whiteboard practice mode
 * Chat turns are stored in local state only and not persisted to database
 */
export function EphemeralChatPane({
  conversationId,
  onHintUsed,
  onAttempt,
  onTurnsChange,
}: EphemeralChatPaneProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingTurnType, setStreamingTurnType] = useState<TurnType | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clear turns when conversationId changes or component unmounts
  useEffect(() => {
    return () => {
      setTurns([]);
      setInput("");
      setIsStreaming(false);
      setStreamingText("");
      setStreamingTurnType(null);
    };
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isStreaming, streamingText]);

  const utils = api.useUtils();
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [subscriptionInput, setSubscriptionInput] = useState<{
    conversationId: string;
    userText?: string;
    userLatex?: string;
    ephemeral: boolean;
  } | null>(null);

  // Set up subscription with ephemeral flag
  api.ai.tutorTurn.useSubscription(
    subscriptionInput ?? {
      conversationId: "",
      userText: "",
      ephemeral: true,
    },
    {
      enabled: subscriptionEnabled && !!subscriptionInput && !!conversationId,
      onData: (data) => {
        if (data.type === "text" && data.content) {
          setStreamingText((prev) => prev + data.content);
        } else if (data.type === "boardAnnotation") {
          // Board annotations were added - refetch board to update Whiteboard
          void utils.board.get.invalidate({ conversationId });
        } else if (data.type === "done") {
          // Create a turn object from the done message (ephemeral, no DB ID)
          if (data.fullText !== undefined) {
            const turn: Turn = {
              id: crypto.randomUUID(), // Generate temporary ID for ephemeral turn
              conversationId,
              role: "assistant",
              text: data.fullText,
              latex: data.latex ?? null,
              tool: data.turnType ? { type: data.turnType } : null,
              createdAt: new Date(),
            };
            const newTurns = [...turns, turn];
            setTurns(newTurns);
            onTurnsChange?.(newTurns);
            setIsStreaming(false);
            setStreamingText("");
            setStreamingTurnType(null);

            // Track hints and attempts
            if (data.turnType === "hint" && onHintUsed) {
              onHintUsed();
            }
          }
          // Refetch board in case annotations were added
          void utils.board.get.invalidate({ conversationId });
          // Disable subscription after completion
          setSubscriptionEnabled(false);
          setSubscriptionInput(null);
        }
      },
      onError: (error) => {
        console.error("Streaming error:", error);
        setIsStreaming(false);
        setStreamingText("");
        setStreamingTurnType(null);
        setSubscriptionEnabled(false);
        setSubscriptionInput(null);
      },
    },
  );

  // Detect if tutor is asking for a math answer
  const isAskingForMathAnswer = useMemo(() => {
    if (turns.length === 0 || isStreaming) return false;

    const lastTurn = turns[turns.length - 1];
    if (!lastTurn) return false;
    if (lastTurn.role !== "assistant" || !lastTurn.text) return false;

    const text = lastTurn.text.toLowerCase();
    const mathKeywords = [
      "what is",
      "solve",
      "find",
      "calculate",
      "answer",
      "value",
      "equals",
      "=",
    ];
    const questionKeywords = ["?", "what", "how"];

    return (
      mathKeywords.some((keyword) => text.includes(keyword)) &&
      (questionKeywords.some((keyword) => text.includes(keyword)) ||
        text.includes("="))
    );
  }, [turns, isStreaming]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || isStreaming) return;

    const userText = input.trim();
    setInput("");

    // Track attempt
    if (onAttempt) {
      onAttempt();
    }

    // Create user turn immediately (optimistic update, ephemeral)
    const userTurn: Turn = {
      id: crypto.randomUUID(), // Temporary ID
      conversationId,
      role: "user",
      text: userText,
      latex: null,
      tool: null,
      createdAt: new Date(),
    };
    const newTurns = [...turns, userTurn];
    setTurns(newTurns);
    onTurnsChange?.(newTurns);

    // Start streaming
    setIsStreaming(true);
    setStreamingText("");
    setStreamingTurnType(null);

    // Trigger subscription with ephemeral flag
    setSubscriptionInput({
      conversationId,
      userText,
      ephemeral: true,
    });
    setSubscriptionEnabled(true);
  };

  const handleMathAnswerSubmit = async (answer: string, latex?: string) => {
    if (!conversationId || isStreaming) return;

    // Track attempt
    if (onAttempt) {
      onAttempt();
    }

    // Create user turn immediately (optimistic update, ephemeral)
    const userTurn: Turn = {
      id: crypto.randomUUID(), // Temporary ID
      conversationId,
      role: "user",
      text: answer,
      latex: latex ?? null,
      tool: null,
      createdAt: new Date(),
    };
    const newTurns = [...turns, userTurn];
    setTurns(newTurns);
    onTurnsChange?.(newTurns);

    // Start streaming
    setIsStreaming(true);
    setStreamingText("");
    setStreamingTurnType(null);

    // Trigger subscription with ephemeral flag
    setSubscriptionInput({
      conversationId,
      userText: answer,
      userLatex: latex,
      ephemeral: true,
    });
    setSubscriptionEnabled(true);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 && !isStreaming && (
          <div className="text-muted-foreground text-center">
            Start practicing! Chat messages here are temporary and won&apos;t be
            saved.
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
      <div className="space-y-2 border-t p-4">
        {isAskingForMathAnswer && (
          <div className="pb-2">
            <p className="text-muted-foreground mb-2 text-sm">
              Enter your math answer:
            </p>
            <MathAnswerBox
              onSubmit={handleMathAnswerSubmit}
              disabled={isStreaming}
            />
          </div>
        )}
        <form onSubmit={handleSubmit}>
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
    </div>
  );
}

