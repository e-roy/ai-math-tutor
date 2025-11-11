"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Trophy, Target, Lightbulb, Clock } from "lucide-react";
import { MathText } from "./MathText";

interface CompletionData {
  problemText: string;
  finalAnswer: string;
  score?: number;
  masteryLevel?: "low" | "medium" | "high";
  attempts: number;
  hintsUsed: number;
  timeElapsed?: number;
}

interface CompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CompletionData | null;
  onNextProblem: () => void;
}

export function CompletionModal({
  open,
  onOpenChange,
  data,
  onNextProblem,
}: CompletionModalProps) {
  const router = useRouter();

  if (!data) return null;

  const getMasteryColor = (level?: string) => {
    switch (level) {
      case "high":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getMasteryLabel = (level?: string) => {
    switch (level) {
      case "high":
        return "Excellent!";
      case "medium":
        return "Good work!";
      case "low":
        return "Keep practicing!";
      default:
        return "Complete!";
    }
  };

  const formatTime = (ms?: number) => {
    if (!ms) return null;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Trophy className="h-8 w-8" />
            <DialogTitle className="text-2xl">Problem Solved!</DialogTitle>
          </div>
          <DialogDescription className="text-center">
            {getMasteryLabel(data.masteryLevel)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Problem and Answer */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    Problem
                  </p>
                  <div className="rounded-lg bg-muted p-3">
                    <MathText text={data.problemText} />
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    Your Answer
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <MathText text={data.finalAnswer} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Target className="text-primary h-5 w-5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Attempts</p>
                    <p className="text-lg font-semibold">{data.attempts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-muted-foreground text-xs">Hints Used</p>
                    <p className="text-lg font-semibold">{data.hintsUsed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {data.timeElapsed && (
              <Card className="col-span-2">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Time Spent
                      </p>
                      <p className="text-lg font-semibold">
                        {formatTime(data.timeElapsed)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Mastery Badge */}
          {data.masteryLevel && (
            <div className="flex justify-center">
              <Badge
                className={`${getMasteryColor(data.masteryLevel)} text-white`}
              >
                Mastery: {data.masteryLevel}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onNextProblem} className="w-full" size="lg">
            Next Problem
          </Button>
          <div className="flex w-full gap-2">
            <Button
              onClick={() => router.push("/progress")}
              variant="outline"
              className="flex-1"
            >
              View Progress
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="flex-1"
            >
              Continue Conversation
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

