"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MathRenderer } from "@/components/MathRenderer";
import { Play, Square } from "lucide-react";

interface ProblemHeaderProps {
  problemText?: string;
  problemLatex?: string;
  isTimerRunning: boolean;
  elapsedTimeMs: number;
  onStartPractice: () => void;
  onFinishSubmit: () => void;
  onProblemChange?: (text: string, latex?: string) => void;
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
 * Compact header with problem input, timer, and action buttons
 */
export function ProblemHeader({
  problemText: initialProblemText,
  problemLatex: initialProblemLatex,
  isTimerRunning,
  elapsedTimeMs,
  onStartPractice,
  onFinishSubmit,
  onProblemChange,
}: ProblemHeaderProps) {
  const [problemText, setProblemText] = useState(initialProblemText ?? "");
  const [problemLatex, setProblemLatex] = useState(initialProblemLatex);
  const [isEditing, setIsEditing] = useState(!initialProblemText);

  const handleProblemTextChange = (value: string) => {
    setProblemText(value);
    if (onProblemChange) {
      onProblemChange(value, problemLatex);
    }
  };

  const handleProblemLatexChange = (value: string) => {
    setProblemLatex(value || undefined);
    if (onProblemChange) {
      onProblemChange(problemText, value || undefined);
    }
  };

  return (
    <div className="border-b bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={problemText}
                onChange={(e) => handleProblemTextChange(e.target.value)}
                placeholder="Enter the problem statement..."
                className="min-h-[60px] resize-none"
              />
              <Textarea
                value={problemLatex ?? ""}
                onChange={(e) => handleProblemLatexChange(e.target.value)}
                placeholder="Enter LaTeX (optional, e.g., $x^2 + 5x + 6 = 0$)..."
                className="min-h-[40px] resize-none font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Problem:</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              </div>
              {problemText ? (
                <p className="text-sm text-muted-foreground">{problemText}</p>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  No problem entered
                </p>
              )}
              {problemLatex && (
                <div className="rounded-md border bg-muted/50 p-2">
                  <MathRenderer latex={problemLatex} displayMode={true} />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isTimerRunning && (
            <div className="text-muted-foreground text-sm font-mono">
              {formatTime(elapsedTimeMs)}
            </div>
          )}
          <Button
            onClick={onStartPractice}
            disabled={isTimerRunning || !problemText.trim()}
            size="sm"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Practice
          </Button>
          <Button
            onClick={onFinishSubmit}
            disabled={!isTimerRunning}
            variant="default"
            size="sm"
          >
            <Square className="mr-2 h-4 w-4" />
            Finish & Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

