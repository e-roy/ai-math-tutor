"use client";

import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import type { TurnType } from "@/types/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "@/components/MessageBubble";
import { Send, CheckCircle } from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { useChatSubscription } from "@/hooks/useChatSubscription";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { api } from "@/trpc/react";

interface EphemeralChatPaneProps {
  conversationId: string;
}

export interface EphemeralChatPaneRef {
  sendMessage: (text: string) => void;
}

/**
 * EphemeralChatPane component for whiteboard practice mode
 * Chat turns are stored in the practice store
 */
export const EphemeralChatPane = forwardRef<
  EphemeralChatPaneRef,
  EphemeralChatPaneProps
>(function EphemeralChatPane({ conversationId }, ref) {
  const problemText = usePracticeStore((state) => state.problemText);
  const chatTurns = usePracticeStore((state) => state.chatTurns);
  const incrementChatAttempts = usePracticeStore(
    (state) => state.incrementChatAttempts,
  );
  const incrementHints = usePracticeStore((state) => state.incrementHints);

  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChatAnswerCorrect, setHasChatAnswerCorrect] = useState(false);
  const [hasWhiteboardAnswerCorrect, setHasWhiteboardAnswerCorrect] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendChatMessageRef = useRef<((message: { text: string; ephemeral: boolean }) => void) | null>(null);

  const utils = api.useUtils();
  const generateProblemMutation = api.practice.generateProblem.useMutation();

  // Use custom practice session hook
  const { handleSubmit, isSubmitting } = usePracticeSession(conversationId);

  // Define submit function before useChatSubscription so it's available in callback
  const onSubmitPractice = useCallback(async () => {
    await handleSubmit({
      problemText,
      chatTurns,
      onAnswerChecked: (answer: string) => {
        // Send the answer check result to chat if sendChatMessage is available
        if (sendChatMessageRef.current) {
          sendChatMessageRef.current({ text: answer, ephemeral: true });
        }
      },
    });
  }, [handleSubmit, problemText, chatTurns]);

  // Use custom chat subscription hook
  const {
    sendMessage: sendChatMessage,
    isStreaming,
    streamingText,
    streamingTurnType,
  } = useChatSubscription({
    conversationId,
    onHintUsed: () => incrementHints(),
    onBoardAnnotation: () => {
      void utils.board.get.invalidate({ conversationId });
    },
    onStreamComplete: (turn) => {
      // Check if AI confirmed chat answer is correct (first part of challenge)
      // AI says "Correct!" when chat answer is right
      if (!hasChatAnswerCorrect && turn.text.includes("Correct!")) {
        setHasChatAnswerCorrect(true);
      }
      
      // Check if AI confirmed whiteboard answer is correct (second part of challenge)
      // AI says "Very good!" when whiteboard answer is correct
      if (!hasWhiteboardAnswerCorrect && turn.text.includes("Very good!")) {
        setHasWhiteboardAnswerCorrect(true);
        // Automatically trigger submission when whiteboard answer is confirmed
        void onSubmitPractice();
      }
    },
  });

  // Store sendChatMessage in ref so it's available in onSubmitPractice callback
  useEffect(() => {
    sendChatMessageRef.current = sendChatMessage;
  }, [sendChatMessage]);

  // Generate problem on mount and show as first assistant message
  useEffect(() => {
    const generateInitialProblem = async () => {
      if (problemText || chatTurns.length > 0) return; // Already have problem or chat started

      setIsGenerating(true);
      try {
        // Generate problem
        const result = await generateProblemMutation.mutateAsync();
        const rawProblem = result.problemText; // e.g., "6 - 3"

        // Format as AI question
        const aiMessage = `Hi! Let's work on this problem together. What is ${rawProblem}?`;

        // Create AI turn
        const aiTurn = {
          id: crypto.randomUUID(),
          conversationId,
          role: "assistant" as const,
          text: aiMessage,
          latex: null,
          tool: null,
          createdAt: new Date(),
        };

        // Update store
        usePracticeStore.setState({
          conversationId,
          problemText: rawProblem, // Keep raw for grading
          chatTurns: [aiTurn],
          isInitialized: true,
        });

        // Auto-start timer
        usePracticeStore.getState().startTimer();
      } catch (error) {
        console.error("Failed to generate problem:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    void generateInitialProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatTurns, isStreaming, streamingText]);

  // Expose sendMessage to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessage: (text: string) => {
      if (isStreaming || !text.trim()) return;
      sendChatMessage({ text, ephemeral: true });
    },
  }));

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || isStreaming) return;

    const userText = input.trim();
    setInput("");

    incrementChatAttempts();
    sendChatMessage({ text: userText, ephemeral: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isGenerating && chatTurns.length === 0 && (
          <div className="text-muted-foreground text-center">
            Generating problem...
          </div>
        )}

        {chatTurns.map((turn) => (
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

      {/* Practice Controls */}
      <div className="space-y-3 border-t p-4">
        {/* Submit button - shown after chat answer is correct */}
        {hasChatAnswerCorrect && !hasWhiteboardAnswerCorrect && (
          <Button
            onClick={onSubmitPractice}
            disabled={isSubmitting || !problemText.trim()}
            className="w-full"
            size="lg"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {isSubmitting ? "Checking whiteboard..." : "Submit Whiteboard Answer"}
          </Button>
        )}

        {/* Show message when whiteboard answer is being processed */}
        {hasWhiteboardAnswerCorrect && (
          <div className="flex items-center justify-center gap-2 rounded-lg border bg-green-50 p-3 text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            {isSubmitting
              ? "Great job! Finalizing your results..."
              : "Answer confirmed! Results will appear shortly..."}
          </div>
        )}

        {/* Chat Input - Available until chat answer is correct */}
        {!hasChatAnswerCorrect && (
          <form onSubmit={handleChatSubmit}>
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask questions or show your work..."
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleChatSubmit(e);
                  }
                }}
              />
              <Button type="submit" disabled={!input.trim() || isStreaming}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
});
