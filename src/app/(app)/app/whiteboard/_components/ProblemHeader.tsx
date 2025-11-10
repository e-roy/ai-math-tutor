"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle } from "lucide-react";
import { extractExpectedAnswer } from "@/lib/grading/equivalence";
import { put } from "@vercel/blob";

interface ProblemHeaderProps {
  conversationId: string;
}

/**
 * Format milliseconds to MM:SS format
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Extract student answer from chat turns
 * Looks for explicit answer markers first, then falls back to last user turn with math content
 * Prefers LaTeX if available, otherwise uses text
 */
function extractStudentAnswer(turns: Array<{ role: string; text: string | null; latex: string | null }>): string | null {
  const userTurns = turns.filter((turn) => turn.role === "user");
  if (userTurns.length === 0) return null;

  // Look for explicit answer markers in reverse order (most recent first)
  const answerMarkers = [
    /(?:my\s+)?(?:final\s+)?answer\s+is\s*[:=]\s*(.+)/i,
    /(?:the\s+)?answer\s+is\s*[:=]\s*(.+)/i,
    /(?:my\s+)?answer\s*[:=]\s*(.+)/i,
    /(?:solution\s+is\s*[:=]\s*(.+))/i,
    /(?:i\s+got\s+)(.+)/i,
    /(?:it\s+is\s+)(.+)/i,
  ];

  for (let i = userTurns.length - 1; i >= 0; i--) {
    const turn = userTurns[i];
    if (!turn) continue;

    // Check text for answer markers
    if (turn.text) {
      for (const marker of answerMarkers) {
        const match = marker.exec(turn.text);
        if (match?.[1]) {
          const extracted = match[1].trim();
          // Remove trailing punctuation
          const cleaned = extracted.replace(/[.,;!?]+$/, "").trim();
          if (cleaned && cleaned.length > 0) {
            // Prefer LaTeX if available for this turn
            if (turn.latex?.trim()) {
              return turn.latex.trim();
            }
            return cleaned;
          }
        }
      }

      // Check if the text is just a number
      const numericMatch = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(turn.text.trim());
      if (numericMatch?.[1]) {
        if (turn.latex?.trim()) {
          return turn.latex.trim();
        }
        return numericMatch[1];
      }
    }
  }

  // Fall back to last user turn with math content
  const lastUserTurn = userTurns[userTurns.length - 1];
  if (!lastUserTurn) return null;

  if (lastUserTurn.latex?.trim()) {
    return lastUserTurn.latex.trim();
  }

  if (lastUserTurn.text?.trim()) {
    const text = lastUserTurn.text.trim();
    const numericMatch = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(text);
    if (numericMatch?.[1]) {
      return numericMatch[1];
    }
    return text;
  }

  return null;
}

/**
 * ProblemHeader component for whiteboard practice mode
 * Compact header with auto-generated problem, timer, and action buttons
 */
export function ProblemHeader({ conversationId }: ProblemHeaderProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTimerRunning = usePracticeStore((state) => state.isTimerRunning);
  const elapsedTimeMs = usePracticeStore((state) => state.elapsedTimeMs);
  const problemText = usePracticeStore((state) => state.problemText);
  const chatTurns = usePracticeStore((state) => state.chatTurns);
  const chatAttemptsCount = usePracticeStore((state) => state.chatAttemptsCount);
  const boardAttemptsCount = usePracticeStore((state) => state.boardAttemptsCount);
  const hintsCount = usePracticeStore((state) => state.hintsCount);

  const startTimer = usePracticeStore((state) => state.startTimer);
  const stopTimer = usePracticeStore((state) => state.stopTimer);
  const setProblemText = usePracticeStore((state) => state.setProblemText);
  const setSessionId = usePracticeStore((state) => state.setSessionId);
  const openResultsModal = usePracticeStore((state) => state.openResultsModal);

  const generateProblem = api.practice.generateProblem.useMutation();
  const createSession = api.practice.createSession.useMutation();
  const getUploadUrl = api.files.getUploadUrl.useMutation();
  const utils = api.useUtils();

  // Generate problem on mount
  useEffect(() => {
    const fetchProblem = async () => {
      setIsGenerating(true);
      try {
        const result = await generateProblem.mutateAsync();
        setProblemText(result.problemText);
      } catch (error) {
        console.error("Failed to generate problem:", error);
        setProblemText("3 + 4"); // Fallback
      } finally {
        setIsGenerating(false);
      }
    };

    void fetchProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    if (!problemText.trim()) return;
    startTimer();
  };

  const handleFinish = async () => {
    if (!isTimerRunning || !conversationId) return;
    
    setIsSubmitting(true);
    stopTimer();

    try {
      // Extract student answer from chat
      const studentAnswer = extractStudentAnswer(chatTurns);

      // Extract expected answer from problem text
      const expectedAnswer = extractExpectedAnswer(problemText);

      // Capture board snapshot
      let boardSnapshotBlobRef: string | null = null;
      try {
        const boardData = await utils.board.get.fetch({ conversationId });
        if (boardData?.scene) {
          const sceneJson = JSON.stringify(boardData.scene);
          const blob = new Blob([sceneJson], { type: "application/json" });

          const uploadInfo = await getUploadUrl.mutateAsync({
            filename: `board-snapshot-${conversationId}-${Date.now()}.png`,
            contentType: "image/png",
          });

          const uploadedBlob = await put(
            uploadInfo.pathname.replace(/\.png$/, ".json"),
            blob,
            {
              access: "public",
              token: uploadInfo.token,
              contentType: "application/json",
            },
          );

          boardSnapshotBlobRef = uploadedBlob.url;
        }
      } catch (error) {
        console.warn("Failed to capture board snapshot:", error);
      }

      // Create practice session
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

      setSessionId(session.id);
      openResultsModal();
    } catch (error) {
      console.error("Failed to create practice session:", error);
      openResultsModal(); // Still show modal even if creation fails
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background border-b p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Problem:</h3>
            {isGenerating ? (
              <p className="text-muted-foreground text-sm">
                Generating problem...
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">{problemText}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isTimerRunning && (
            <div className="text-muted-foreground font-mono text-sm">
              {formatTime(elapsedTimeMs)}
            </div>
          )}
          {!isTimerRunning ? (
            <Button
              onClick={handleStart}
              disabled={!problemText.trim() || isGenerating}
              size="default"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Practice
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={isSubmitting}
              variant="default"
              size="default"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Finish & Submit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
