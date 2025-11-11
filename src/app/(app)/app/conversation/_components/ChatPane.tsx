"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Turn } from "@/server/db/turns";
import type { TurnType } from "@/types/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "@/components/MessageBubble";
import { MathAnswerBox } from "@/components/MathAnswerBox";
import { useChatStore } from "@/store/useChatStore";
import { api } from "@/trpc/react";
import { Send } from "lucide-react";
import { checkEquivalence } from "@/lib/math/equivalence";
import { extractExpectedAnswer } from "@/lib/grading/equivalence";
import type { UploadedImage } from "@/types/files";

interface ChatPaneProps {
  conversationId: string;
  tutorAvatarUrl?: string;
  tutorDisplayName?: string;
  uploadedImages?: UploadedImage[];
}

export function ChatPane({
  conversationId,
  tutorAvatarUrl,
  tutorDisplayName,
  uploadedImages = [],
}: ChatPaneProps) {
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
    userText?: string;
    userLatex?: string;
    fileId?: string;
  } | null>(null);

  // Set up subscription at component level (hooks must be at top level)
  api.ai.tutorTurnConversation.useSubscription(
    subscriptionInput ?? { conversationId: "", userText: "" },
    {
      enabled: subscriptionEnabled && !!subscriptionInput && !!conversationId,
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

  // Count hints used during conversation
  const hintsCount = useMemo(() => {
    return turns.filter((turn) => {
      if (turn.role !== "assistant" || !turn.tool) return false;
      const toolType = (turn.tool as { type?: string }).type;
      return toolType === "hint";
    }).length;
  }, [turns]);

  // Helper function to extract problem text from various sources
  const extractProblemText = useMemo(() => {
    // First try: OCR text from uploaded images
    if (uploadedImages.length > 0) {
      const firstImageWithOcr = uploadedImages.find(
        (img) => img.ocrText && !img.isProcessingOcr && !img.ocrError,
      );
      if (firstImageWithOcr?.ocrText) {
        return firstImageWithOcr.ocrText;
      }
    }

    // Second try: First user message in conversation
    const firstUserTurn = turns.find((turn) => turn.role === "user");
    if (firstUserTurn?.text) {
      return firstUserTurn.text;
    }

    // Third try: First user turn with LaTeX
    if (firstUserTurn?.latex) {
      return firstUserTurn.latex;
    }

    return null;
  }, [uploadedImages, turns]);

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

    // Get fileId from first uploaded image if available
    const firstImageWithFileId = uploadedImages.find(
      (img) => img.fileId && !img.isProcessingOcr && !img.ocrError,
    );

    // Start streaming
    setStreaming(true);
    setStreamingTurnType(null);

    // Trigger subscription
    setSubscriptionInput({
      conversationId,
      userText,
      fileId: firstImageWithFileId?.fileId,
    });
    setSubscriptionEnabled(true);
  };

  const verifyEquivalence = api.ai.verifyEquivalence.useMutation();
  const updateMastery = api.progress.updateMastery.useMutation();

  const handleMathAnswerSubmit = async (answer: string, latex?: string) => {
    if (!conversationId || isStreaming) return;

    // Create user turn immediately (optimistic update)
    const userTurn: Turn = {
      id: crypto.randomUUID(), // Temporary ID
      conversationId,
      role: "user",
      text: answer,
      latex: latex ?? null,
      tool: null,
      createdAt: new Date(),
    };
    setTurns([...turns, userTurn]);

    // Extract problem text and validate answer if possible
    const problemText = extractProblemText;
    if (problemText) {
      const expectedAnswer = extractExpectedAnswer(problemText);
      if (expectedAnswer) {
        // Validate using client-side equivalence check
        const clientResult = checkEquivalence(answer, expectedAnswer);
        let isValid = clientResult.isEquivalent;

        // If confidence is low, use server-side LLM validation
        if (clientResult.confidence === "low") {
          try {
            const serverResult = await verifyEquivalence.mutateAsync({
              studentAnswer: answer,
              expectedAnswer: expectedAnswer,
            });
            isValid = serverResult.isEquivalent;
          } catch (error) {
            console.error("Validation error:", error);
            // Continue with client-side result if server validation fails
          }
        }

        // Note: Mastery updates are still TODO - requires skill extraction
        // which is more complex and not part of this implementation
      }
    }

    // Get fileId from first uploaded image if available
    const firstImageWithFileId = uploadedImages.find(
      (img) => img.fileId && !img.isProcessingOcr && !img.ocrError,
    );

    // Start streaming
    setStreaming(true);
    setStreamingTurnType(null);

    // Trigger subscription with userLatex
    setSubscriptionInput({
      conversationId,
      userText: answer,
      userLatex: latex,
      fileId: firstImageWithFileId?.fileId,
    });
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
        {hintsCount > 0 && (
          <div className="bg-muted/50 text-muted-foreground rounded-md border p-2 text-xs">
            Hints used: {hintsCount}
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
