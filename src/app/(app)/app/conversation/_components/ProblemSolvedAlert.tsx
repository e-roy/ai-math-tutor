"use client";

import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ProblemSolvedAlertProps {
  attempts: number;
  onStartNew: () => void;
}

export function ProblemSolvedAlert({
  attempts,
  onStartNew,
}: ProblemSolvedAlertProps) {
  return (
    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertTitle className="text-green-800 dark:text-green-200">
        Problem Solved!
      </AlertTitle>
      <AlertDescription className="text-green-700 dark:text-green-300">
        Great job! You've successfully solved this problem
        {attempts > 0
          ? ` in ${attempts} attempt${attempts === 1 ? "" : "s"}.`
          : " on your first try!"}
        <div className="mt-3">
          <Button
            onClick={onStartNew}
            variant="outline"
            size="sm"
            className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900"
          >
            Start New Problem
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

