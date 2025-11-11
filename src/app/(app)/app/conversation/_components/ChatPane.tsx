"use client";

import { useState, useMemo } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useConversationStore } from "@/store/useConversationStore";
import { useTutorStream } from "@/hooks/useTutorStream";
import { useAnswerValidation } from "@/hooks/useAnswerValidation";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { ProblemSolvedAlert } from "./ProblemSolvedAlert";
import { HintsBadge } from "./HintsBadge";
import { AnswerValidationBadge } from "./AnswerValidationBadge";
import { CompletionModal } from "./CompletionModal";
import { extractExpectedAnswer } from "@/lib/grading/equivalence";
import type { Turn } from "@/server/db/turns";
import { Badge } from "@/components/ui/badge";
import { trackProblemCompletion } from "@/lib/progress/track-completion";
import { api } from "@/trpc/react";

interface ChatPaneProps {
  conversationId: string;
  tutorAvatarUrl?: string;
  tutorDisplayName?: string;
}

export function ChatPane({
  conversationId,
  tutorAvatarUrl,
  tutorDisplayName,
}: ChatPaneProps) {
  const [input, setInput] = useState("");
  const { turns, setTurns, isStreaming } = useChatStore();
  const {
    uploadedImages,
    isProblemSolved,
    answerAttempts,
    resetProblem,
    consecutiveWrongAttempts,
    isCompletionModalOpen,
    completionData,
    openCompletionModal,
    closeCompletionModal,
    hintRequests,
    incrementHintRequests,
  } = useConversationStore();

  const { startStreaming } = useTutorStream(conversationId);
  const { validateAnswer } = useAnswerValidation();
  const updateMasteryMutation = api.progress.updateMastery.useMutation();

  // Extract problem text from images or first user turn
  const extractProblemText = useMemo(() => {
    const firstImageWithOcr = uploadedImages.find(
      (img) => img.ocrText && !img.isProcessingOcr && !img.ocrError,
    );
    if (firstImageWithOcr?.ocrText) return firstImageWithOcr.ocrText;

    const firstUserTurn = turns.find((turn) => turn.role === "user");
    return firstUserTurn?.text ?? firstUserTurn?.latex ?? null;
  }, [uploadedImages, turns]);

  // Count hints
  const hintsCount = useMemo(() => {
    return turns.filter((turn) => {
      if (turn.role !== "assistant" || !turn.tool) return false;
      return (turn.tool as { type?: string }).type === "hint";
    }).length;
  }, [turns]);

  // Check if student is stuck
  const isStuck = useMemo(() => {
    return consecutiveWrongAttempts >= 2;
  }, [consecutiveWrongAttempts]);

  // Check if asking for math answer
  const isAskingForMathAnswer = useMemo(() => {
    if (turns.length === 0 || isStreaming) return false;
    const lastTurn = turns[turns.length - 1];
    if (!lastTurn?.text || lastTurn.role !== "assistant") return false;

    const text = lastTurn.text.toLowerCase();
    const mathKeywords = [
      "what is",
      "solve",
      "find",
      "calculate",
      "answer",
      "value",
    ];
    const questionKeywords = ["?", "what", "how"];

    return (
      mathKeywords.some((k) => text.includes(k)) &&
      questionKeywords.some((k) => text.includes(k))
    );
  }, [turns, isStreaming]);

  const handleHintRequest = () => {
    if (isStreaming) return;

    // Increment hint counter
    incrementHintRequests();

    // Send hint request message to AI
    const hintRequestText = "I would like a hint, please.";
    const userTurn: Turn = {
      id: crypto.randomUUID(),
      conversationId,
      role: "user",
      text: hintRequestText,
      latex: null,
      tool: null,
      createdAt: new Date(),
    };
    setTurns([...turns, userTurn]);

    const fileId = uploadedImages.find(
      (img) => img.fileId && !img.isProcessingOcr && !img.ocrError,
    )?.fileId;

    // Pass isHintRequest flag to AI
    startStreaming({ userText: hintRequestText, fileId, isHintRequest: true });
  };

  const handleSubmit = async (userText: string) => {
    if (!userText.trim() || isStreaming) return;

    // Optimistic user turn
    const userTurn: Turn = {
      id: crypto.randomUUID(),
      conversationId,
      role: "user",
      text: userText,
      latex: null,
      tool: null,
      createdAt: new Date(),
    };
    setTurns([...turns, userTurn]);

    const fileId = uploadedImages.find(
      (img) => img.fileId && !img.isProcessingOcr && !img.ocrError,
    )?.fileId;

    startStreaming({ userText, fileId });
  };

  const handleMathAnswerSubmit = async (answer: string, latex?: string) => {
    if (isStreaming) return;

    // Optimistic user turn
    const userTurn: Turn = {
      id: crypto.randomUUID(),
      conversationId,
      role: "user",
      text: answer,
      latex: latex ?? null,
      tool: null,
      createdAt: new Date(),
    };
    setTurns([...turns, userTurn]);

    // Validate if we have expected answer
    const problemText = extractProblemText;
    if (problemText) {
      const expectedAnswer = extractExpectedAnswer(problemText);
      if (expectedAnswer) {
        const isValid = await validateAnswer(answer, expectedAnswer);
        
        // Track completion and show modal if problem is solved correctly
        if (isValid) {
          const currentAttempts = answerAttempts + 1;
          
          await trackProblemCompletion(
            {
              problemText,
              conversationId,
              turns,
              attempts: currentAttempts,
              hintsUsed: hintsCount,
              isCorrect: true,
            },
            updateMasteryMutation,
          );

          // Determine mastery level based on performance
          let masteryLevel: "low" | "medium" | "high" = "low";
          if (currentAttempts === 1 && hintsCount === 0) {
            masteryLevel = "high";
          } else if (currentAttempts <= 2 && hintsCount <= 1) {
            masteryLevel = "high";
          } else if (currentAttempts <= 3) {
            masteryLevel = "medium";
          } else {
            masteryLevel = "low";
          }

          // Open completion modal with data
          openCompletionModal({
            problemText,
            finalAnswer: answer,
            attempts: currentAttempts,
            hintsUsed: hintsCount,
            masteryLevel,
          });
        }
      }
    }

    const fileId = uploadedImages.find(
      (img) => img.fileId && !img.isProcessingOcr && !img.ocrError,
    )?.fileId;

    startStreaming({ userText: answer, userLatex: latex, fileId });
  };

  const handleNextProblem = () => {
    closeCompletionModal();
    resetProblem();
  };

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <ChatMessages
          conversationId={conversationId}
          tutorAvatarUrl={tutorAvatarUrl}
          tutorDisplayName={tutorDisplayName}
        />

        <div className="flex-shrink-0 space-y-2 border-t p-4">
          <div className="flex gap-2">
            <HintsBadge count={hintsCount} />
            <AnswerValidationBadge />
            {isStuck && (
              <Badge variant="outline" className="bg-yellow-50">
                Need help? Consider asking for a hint
              </Badge>
            )}
          </div>

          {isProblemSolved && (
            <ProblemSolvedAlert
              attempts={answerAttempts}
              onStartNew={resetProblem}
            />
          )}

          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            onMathAnswerSubmit={handleMathAnswerSubmit}
            onHintRequest={handleHintRequest}
            disabled={isStreaming}
            showMathInput={isAskingForMathAnswer}
            hintCount={hintRequests}
          />
        </div>
      </div>

      <CompletionModal
        open={isCompletionModalOpen}
        onOpenChange={closeCompletionModal}
        data={completionData}
        onNextProblem={handleNextProblem}
      />
    </>
  );
}
