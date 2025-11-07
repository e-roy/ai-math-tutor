"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";

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
  // Hardcoded problem for now - will be replaced with AI generation later
  const problemText = "2 + 2";

  // Generate problem on mount and notify parent
  useEffect(() => {
    onProblemChange(problemText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div className="bg-background border-b p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Problem:</h3>
            <p className="text-muted-foreground text-sm">{problemText}</p>
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
