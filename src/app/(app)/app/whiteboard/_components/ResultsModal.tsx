"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { MathRenderer } from "../../conversation/_components/MathRenderer";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { createEmptyScene } from "@/lib/whiteboard/scene-adapters";
import { useState } from "react";

interface ResultsModalProps {
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
 * Get mastery badge variant and icon
 */
function getMasteryBadgeProps(mastery: "low" | "medium" | "high" | null) {
  switch (mastery) {
    case "high":
      return {
        variant: "default" as const,
        className: "bg-green-500 hover:bg-green-600",
        icon: CheckCircle2,
        label: "High Mastery",
      };
    case "medium":
      return {
        variant: "secondary" as const,
        className: "bg-yellow-500 hover:bg-yellow-600",
        icon: AlertCircle,
        label: "Medium Mastery",
      };
    case "low":
      return {
        variant: "destructive" as const,
        className: "bg-red-500 hover:bg-red-600",
        icon: XCircle,
        label: "Low Mastery",
      };
    default:
      return {
        variant: "outline" as const,
        className: "",
        icon: AlertCircle,
        label: "No Mastery",
      };
  }
}

/**
 * ResultsModal component - displays practice session results
 */
export function ResultsModal({ conversationId }: ResultsModalProps) {
  const router = useRouter();
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);

  const open = usePracticeStore((state) => state.isResultsModalOpen);
  const closeResultsModal = usePracticeStore((state) => state.closeResultsModal);
  const sessionId = usePracticeStore((state) => state.sessionId);
  const timeOnTaskMs = usePracticeStore((state) => state.elapsedTimeMs);
  const setProblemText = usePracticeStore((state) => state.setProblemText);
  const resetSession = usePracticeStore((state) => state.resetSession);

  const generateProblem = api.practice.generateProblem.useMutation();
  const saveBoard = api.board.save.useMutation();
  const utils = api.useUtils();

  // Fetch practice session if sessionId provided
  const { data: session, isLoading } = api.practice.getSession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId && open },
  );

  const masteryBadgeProps = session
    ? getMasteryBadgeProps(session.mastery)
    : null;
  const MasteryIcon = masteryBadgeProps?.icon ?? AlertCircle;

  const handleGoHome = () => {
    closeResultsModal();
    router.push("/app");
  };

  const handleAnotherProblem = async () => {
    setIsGeneratingNext(true);
    
    try {
      // Generate new problem
      const result = await generateProblem.mutateAsync();
      setProblemText(result.problemText);

      // Clear the board
      try {
        const boardData = await utils.board.get.fetch({ conversationId });
        const emptyScene = createEmptyScene();
        await saveBoard.mutateAsync({
          conversationId,
          scene: emptyScene,
          version: boardData?.version ?? 1,
        });
      } catch (error) {
        console.warn("Failed to clear board:", error);
      }

      // Reset session state
      resetSession();
      closeResultsModal();
    } catch (error) {
      console.error("Failed to generate new problem:", error);
      // Fallback
      setProblemText("3 + 4");
      
      // Still try to clear board
      try {
        const boardData = await utils.board.get.fetch({ conversationId });
        const emptyScene = createEmptyScene();
        await saveBoard.mutateAsync({
          conversationId,
          scene: emptyScene,
          version: boardData?.version ?? 1,
        });
      } catch (boardError) {
        console.warn("Failed to clear board:", boardError);
      }

      resetSession();
      closeResultsModal();
    } finally {
      setIsGeneratingNext(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={closeResultsModal}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Practice Session Results</DialogTitle>
          <DialogDescription>
            {session
              ? "Review your practice session performance"
              : "Practice session results"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading && (
            <div className="text-muted-foreground text-center text-sm">
              Loading results...
            </div>
          )}

          {!isLoading && session && (
            <>
              {/* Score and Mastery */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Score</p>
                  <div className="text-2xl font-bold">
                    {session.score !== null
                      ? `${Math.round(session.score * 100)}%`
                      : "N/A"}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Mastery Level</p>
                  {masteryBadgeProps && (
                    <Badge
                      variant={masteryBadgeProps.variant}
                      className={masteryBadgeProps.className}
                    >
                      <MasteryIcon className="mr-1 h-3 w-3" />
                      {masteryBadgeProps.label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="bg-muted/50 grid grid-cols-3 gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Time</p>
                  <p className="font-mono text-sm">
                    {formatTime(session.timeOnTaskMs)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Attempts</p>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      Chat: {session.chatAttempts ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Board: {session.boardAttempts ?? 0}
                    </p>
                    <p className="text-sm font-semibold">
                      Total: {(session.chatAttempts ?? 0) + (session.boardAttempts ?? 0)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Hints Used</p>
                  <p className="text-sm font-semibold">{session.hintsUsed}</p>
                </div>
              </div>

              {/* Answers Comparison */}
              {(session.studentAnswer ?? session.expectedAnswer) && (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">Answer Comparison</p>
                  {session.expectedAnswer && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        Expected Answer:
                      </p>
                      <div className="bg-background rounded-md border p-2">
                        {session.expectedAnswer.includes("$") ||
                        session.expectedAnswer.includes("\\(") ||
                        session.expectedAnswer.includes("\\[") ? (
                          <MathRenderer
                            latex={session.expectedAnswer}
                            displayMode={true}
                          />
                        ) : (
                          <p className="text-sm">{session.expectedAnswer}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {session.studentAnswer && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        Your Answer:
                      </p>
                      <div className="bg-background rounded-md border p-2">
                        {session.studentAnswer.includes("$") ||
                        session.studentAnswer.includes("\\(") ||
                        session.studentAnswer.includes("\\[") ? (
                          <MathRenderer
                            latex={session.studentAnswer}
                            displayMode={true}
                          />
                        ) : (
                          <p className="text-sm">{session.studentAnswer}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes/Reason */}
              {session.notes && (
                <div className="bg-muted/50 space-y-1 rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs font-medium">
                    Feedback:
                  </p>
                  <p className="text-sm">{session.notes}</p>
                </div>
              )}
            </>
          )}

          {!isLoading && !session && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Time on Task:</p>
                <p className="text-muted-foreground font-mono text-sm">
                  {formatTime(timeOnTaskMs)}
                </p>
              </div>
              <div className="text-muted-foreground text-sm">
                Session not saved. Results will be displayed when session is
                created.
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={handleGoHome} variant="outline" disabled={isGeneratingNext}>
            Go Home
          </Button>
          <Button onClick={handleAnotherProblem} disabled={isGeneratingNext}>
            {isGeneratingNext ? "Generating..." : "Another Problem"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
