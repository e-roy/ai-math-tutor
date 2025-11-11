import { useState } from "react";
import { api } from "@/trpc/react";
import { useChatStore } from "@/store/useChatStore";
import type { Turn } from "@/server/db/turns";

export function useTutorStream(conversationId: string) {
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [subscriptionInput, setSubscriptionInput] = useState<{
    conversationId: string;
    userText?: string;
    userLatex?: string;
    fileId?: string;
  } | null>(null);

  const {
    appendStreamingText,
    finalizeStreaming,
    clearStreaming,
    setStreaming,
    setStreamingTurnType,
  } = useChatStore();

  const utils = api.useUtils();

  api.ai.tutorTurnConversation.useSubscription(
    subscriptionInput ?? { conversationId: "", userText: "" },
    {
      enabled: subscriptionEnabled && !!subscriptionInput && !!conversationId,
      onData: (data) => {
        if (data.type === "text" && data.content) {
          appendStreamingText(data.content);
        } else if (data.type === "done") {
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
            void utils.conversations.getTurns.invalidate({ conversationId });
          }
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

  const startStreaming = (input: {
    userText?: string;
    userLatex?: string;
    fileId?: string;
  }) => {
    setStreaming(true);
    setStreamingTurnType(null);
    setSubscriptionInput({ conversationId, ...input });
    setSubscriptionEnabled(true);
  };

  return { startStreaming };
}

