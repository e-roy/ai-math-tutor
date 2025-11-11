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
import { extractExpectedAnswer } from "@/lib/grading/equivalence";
import type { Turn } from "@/server/db/turns";

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
  const { uploadedImages, isProblemSolved, answerAttempts, resetProblem } =
    useConversationStore();

  const { startStreaming } = useTutorStream(conversationId);
  const { validateAnswer } = useAnswerValidation();

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
        await validateAnswer(answer, expectedAnswer);
      }
    }

    const fileId = uploadedImages.find(
      (img) => img.fileId && !img.isProcessingOcr && !img.ocrError,
    )?.fileId;

    startStreaming({ userText: answer, userLatex: latex, fileId });
  };

  return (
    <div className="flex h-full flex-col">
      <ChatMessages
        conversationId={conversationId}
        tutorAvatarUrl={tutorAvatarUrl}
        tutorDisplayName={tutorDisplayName}
      />

      <div className="space-y-2 p-4">
        <div className="flex gap-2">
          <HintsBadge count={hintsCount} />
          <AnswerValidationBadge />
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
          disabled={isStreaming}
          showMathInput={isAskingForMathAnswer}
        />
      </div>
    </div>
  );
}
