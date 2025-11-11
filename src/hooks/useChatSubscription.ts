import { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import type { Turn } from "@/server/db/turns";
import type { TurnType } from "@/types/ai";
import { usePracticeStore } from "@/store/usePracticeStore";

interface UseChatSubscriptionOptions {
  conversationId: string;
  onHintUsed?: () => void;
  onBoardAnnotation?: () => void;
  onStreamComplete?: (turn: {
    text: string;
    turnType: TurnType | null;
  }) => void;
}

interface ChatMessage {
  text?: string;
  latex?: string;
  ephemeral?: boolean;
  problemText?: string;
  isWhiteboardSubmission?: boolean;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    text: string | null;
    latex: string | null;
  }>;
}

export function useChatSubscription({
  conversationId,
  onHintUsed,
  onBoardAnnotation,
  onStreamComplete,
}: UseChatSubscriptionOptions) {
  const chatTurns = usePracticeStore((state) => state.chatTurns);
  const setChatTurns = usePracticeStore((state) => state.setChatTurns);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingTurnType, setStreamingTurnType] = useState<TurnType | null>(
    null,
  );
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [subscriptionInput, setSubscriptionInput] = useState<{
    conversationId: string;
    userText?: string;
    userLatex?: string;
    ephemeral: boolean;
    problemText?: string;
    isWhiteboardSubmission?: boolean;
    conversationHistory?: Array<{
      role: "user" | "assistant";
      text: string | null;
      latex: string | null;
    }>;
  } | null>(null);

  // Set up subscription
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
          onBoardAnnotation?.();
        } else if (data.type === "done") {
          if (data.fullText !== undefined) {
            const turn: Turn = {
              id: crypto.randomUUID(),
              conversationId,
              role: "assistant",
              text: data.fullText,
              latex: data.latex ?? null,
              tool: data.turnType ? { type: data.turnType } : null,
              createdAt: new Date(),
            };
            setChatTurns([...chatTurns, turn]);
            setIsStreaming(false);
            setStreamingText("");
            setStreamingTurnType(null);

            // Track hints
            if (data.turnType === "hint") {
              onHintUsed?.();
            }

            // Notify when stream completes
            onStreamComplete?.({
              text: data.fullText,
              turnType: data.turnType ?? null,
            });
          }
          onBoardAnnotation?.();
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

  // Send message function
  const sendMessage = useCallback(
    (message: ChatMessage) => {
      if (isStreaming) return;

      // If sending text, create user turn
      if (message.text) {
        const userTurn: Turn = {
          id: crypto.randomUUID(),
          conversationId,
          role: "user",
          text: message.text,
          latex: message.latex ?? null,
          tool: null,
          createdAt: new Date(),
        };
        setChatTurns([...chatTurns, userTurn]);
      }

      // Start streaming
      setIsStreaming(true);
      setStreamingText("");
      setStreamingTurnType(null);

      // Build conversation history (exclude current message)
      const historyWithoutCurrent = message.text
        ? chatTurns.map((turn) => ({
            role: turn.role,
            text: turn.text,
            latex: turn.latex,
          }))
        : message.conversationHistory ?? [];

      // Trigger subscription
      setSubscriptionInput({
        conversationId,
        userText: message.text,
        userLatex: message.latex,
        ephemeral: message.ephemeral ?? true,
        problemText: message.problemText,
        isWhiteboardSubmission: message.isWhiteboardSubmission,
        conversationHistory: historyWithoutCurrent,
      });
      setSubscriptionEnabled(true);
    },
    [conversationId, chatTurns, setChatTurns, isStreaming],
  );

  return {
    sendMessage,
    isStreaming,
    streamingText,
    streamingTurnType,
  };
}

