"use client";

import { useState, useRef, useEffect } from "react";
import type { Turn } from "@/server/db/turns";
import type { TurnType } from "@/types/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "@/components/MessageBubble";
import { api } from "@/trpc/react";
import { Send } from "lucide-react";

interface EphemeralChatPaneProps {
  conversationId: string;
  problemText?: string;
  isPracticeActive?: boolean;
  onHintUsed?: () => void;
  onChatAttempt?: () => void;
  onTurnsChange?: (turns: Turn[]) => void;
  triggerMessage?: string | null;
}

/**
 * EphemeralChatPane component for whiteboard practice mode
 * Chat turns are stored in local state only and not persisted to database
 */
export function EphemeralChatPane({
  conversationId,
  problemText,
  isPracticeActive,
  onHintUsed,
  onChatAttempt,
  onTurnsChange,
  triggerMessage,
}: EphemeralChatPaneProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingTurnType, setStreamingTurnType] = useState<TurnType | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTriggerMessageRef = useRef<string | null>(null);

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
    problemText?: string;
    conversationHistory?: Array<{
      role: "user" | "assistant";
      text: string | null;
      latex: string | null;
    }>;
  } | null>(null);

  // Auto-send problem text to AI when practice starts
  useEffect(() => {
    if (
      isPracticeActive &&
      problemText?.trim() &&
      turns.length === 0 &&
      !isStreaming &&
      !subscriptionEnabled
    ) {
      // Start streaming
      setIsStreaming(true);
      setStreamingText("");
      setStreamingTurnType(null);

      // Trigger subscription with problemText directly
      // This will cause the AI to start the conversation without showing a user message
      setSubscriptionInput({
        conversationId,
        problemText: problemText.trim(),
        ephemeral: true,
        conversationHistory: [], // First message, no history yet
      });
      setSubscriptionEnabled(true);
    }
  }, [
    isPracticeActive,
    problemText,
    turns.length,
    isStreaming,
    subscriptionEnabled,
    conversationId,
  ]);

  // Handle triggerMessage from parent (e.g., whiteboard submit)
  // Allow processing even while streaming to enable re-submissions
  useEffect(() => {
    if (
      triggerMessage?.trim() &&
      triggerMessage !== lastTriggerMessageRef.current &&
      conversationId
    ) {
      // Mark this message as processed
      lastTriggerMessageRef.current = triggerMessage;

      // Create user turn immediately (optimistic update, ephemeral)
      const userTurn: Turn = {
        id: crypto.randomUUID(),
        conversationId,
        role: "user",
        text: triggerMessage.trim(),
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

      // Trigger subscription with ephemeral flag and conversation history
      const historyWithoutCurrent = turns.map((turn) => ({
        role: turn.role,
        text: turn.text,
        latex: turn.latex,
      }));
      setSubscriptionInput({
        conversationId,
        userText: triggerMessage.trim(),
        ephemeral: true,
        conversationHistory: historyWithoutCurrent,
      });
      setSubscriptionEnabled(true);
    }
  }, [triggerMessage, conversationId, turns, onTurnsChange]);

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
          // Reset lastTriggerMessageRef to allow re-submission of the same answer
          lastTriggerMessageRef.current = null;
        }
      },
      onError: (error) => {
        console.error("Streaming error:", error);
        setIsStreaming(false);
        setStreamingText("");
        setStreamingTurnType(null);
        setSubscriptionEnabled(false);
        setSubscriptionInput(null);
        // Reset lastTriggerMessageRef to allow re-submission after error
        lastTriggerMessageRef.current = null;
      },
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || isStreaming) return;

    const userText = input.trim();
    setInput("");

    // Track chat attempt
    if (onChatAttempt) {
      onChatAttempt();
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

    // Trigger subscription with ephemeral flag and conversation history
    // Exclude the current turn since it will be added by the server
    const historyWithoutCurrent = turns.map((turn) => ({
      role: turn.role,
      text: turn.text,
      latex: turn.latex,
    }));
    setSubscriptionInput({
      conversationId,
      userText,
      ephemeral: true,
      conversationHistory: historyWithoutCurrent,
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
