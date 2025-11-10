"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";
import { api } from "@/trpc/react";

interface ProblemHeaderProps {
  isTimerRunning: boolean;
  elapsedTimeMs: number;
  onStartPractice: () => void;
  onFinishSubmit: () => void;
  onProblemChange: (text: string) => void;
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
 * ProblemHeader component for whiteboard practice mode
 * Compact header with auto-generated problem, timer, and action buttons
 */
export function ProblemHeader({
  isTimerRunning,
  elapsedTimeMs,
  onStartPractice,
  onFinishSubmit,
  onProblemChange,
}: ProblemHeaderProps) {
  const [problemText, setProblemText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(true);

  const generateProblem = api.practice.generateProblem.useMutation();

  // Generate problem on mount and notify parent
  useEffect(() => {
    const fetchProblem = async () => {
      setIsGenerating(true);
      try {
        const result = await generateProblem.mutateAsync();
        const newProblem = result.problemText;
        setProblemText(newProblem);
        onProblemChange(newProblem);
      } catch (error) {
        console.error("Failed to generate problem:", error);
        // Fallback to default problem
        const fallback = "3 + 4";
        setProblemText(fallback);
        onProblemChange(fallback);
      } finally {
        setIsGenerating(false);
      }
    };

    void fetchProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div className="bg-background border-b p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Problem:</h3>
            {isGenerating ? (
              <p className="text-muted-foreground text-sm">Generating problem...</p>
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
          <Button
            onClick={onStartPractice}
            disabled={isTimerRunning || !problemText.trim()}
            size="sm"
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            onClick={onFinishSubmit}
            disabled={!isTimerRunning}
            variant="default"
            size="sm"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
