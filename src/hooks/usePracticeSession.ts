"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { extractStudentAnswer } from "@/lib/practice/answer-extraction";
import { captureBoardSnapshot } from "@/lib/practice/board-snapshot";
import { extractExpectedAnswer } from "@/lib/grading/equivalence";
import type { Turn } from "@/server/db/turns";

interface SubmitOptions {
  problemText: string;
  chatTurns: Turn[];
  onAnswerChecked: (answer: string) => void;
}

/**
 * Custom hook for managing practice session lifecycle
 * Handles start and submit (which combines whiteboard check + finish)
 */
export function usePracticeSession(conversationId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();
  const checkAnswerMutation = api.board.checkWhiteboardAnswer.useMutation();
  const createSession = api.practice.createSession.useMutation();
  const getUploadUrl = api.files.getUploadUrl.useMutation();

  const handleStart = () => {
    usePracticeStore.getState().startTimer();
  };

  const handleSubmit = async (options: SubmitOptions) => {
    const { problemText, chatTurns, onAnswerChecked } = options;

    if (isSubmitting || !problemText.trim()) {
      return;
    }

    setIsSubmitting(true);
    const practiceStore = usePracticeStore.getState();

    try {
      // Step 1: Check whiteboard answer
      const result = await checkAnswerMutation.mutateAsync({
        conversationId,
        problemText: problemText.trim(),
      });

      practiceStore.incrementBoardAttempts();

      // Step 2: Send result to chat
      const submissionMessage = `The answer is ${result.extractedAnswer ?? ""}`;
      onAnswerChecked(submissionMessage);

      // Step 3: Stop timer
      practiceStore.stopTimer();

      // Get final metrics
      const chatAttemptsCount = practiceStore.chatAttemptsCount;
      const boardAttemptsCount = practiceStore.boardAttemptsCount;
      const hintsCount = practiceStore.hintsCount;
      const elapsedTimeMs = practiceStore.elapsedTimeMs;

      // Step 4: Extract answers
      const studentAnswer = extractStudentAnswer(chatTurns);
      const expectedAnswer = extractExpectedAnswer(problemText);

      // Step 5: Capture board snapshot
      const boardSnapshotBlobRef = await captureBoardSnapshot(
        conversationId,
        utils,
        getUploadUrl,
      );

      // Step 6: Create practice session
      const session = await createSession.mutateAsync({
        conversationId,
        rawProblemText: problemText,
        chatAttempts: chatAttemptsCount,
        boardAttempts: boardAttemptsCount,
        hintsUsed: hintsCount,
        timeOnTaskMs: elapsedTimeMs,
        studentAnswer: studentAnswer,
        expectedAnswer: expectedAnswer ?? undefined,
        boardSnapshotBlobRef: boardSnapshotBlobRef ?? undefined,
      });

      practiceStore.setSessionId(session.id);

      // Step 7: Show results modal
      practiceStore.openResultsModal();
    } catch (error) {
      console.error("Failed to submit practice session:", error);
      // Don't open modal on error - let user retry or continue chatting
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleStart,
    handleSubmit,
    isSubmitting,
  };
}
