"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { api } from "@/trpc/react";

// Dynamically import Whiteboard to avoid SSR issues with Excalidraw
const DynamicWhiteboard = dynamic(
  () =>
    import("@/app/(app)/app/whiteboard/_components/Whiteboard").then(
      (mod) => ({
        default: mod.Whiteboard,
      }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] items-center justify-center rounded-xl border">
        <p className="text-muted-foreground">Loading whiteboard...</p>
      </div>
    ),
  },
);

interface WhiteboardPanelProps {
  conversationId: string;
  problemText: string;
  isPracticeActive: boolean;
  onSubmit: (isCorrect: boolean, extractedAnswer: string) => void;
}

/**
 * WhiteboardPanel component for whiteboard practice mode
 * Features:
 * - Large Excalidraw whiteboard (main focus)
 * - Submit button to check whiteboard answer
 */
export function WhiteboardPanel({
  conversationId,
  problemText,
  isPracticeActive,
  onSubmit,
}: WhiteboardPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkAnswerMutation = api.board.checkWhiteboardAnswer.useMutation({
    onSuccess: (result) => {
      setIsSubmitting(false);
      onSubmit(result.isCorrect, result.extractedAnswer ?? "");
    },
    onError: (error) => {
      console.error("Failed to check whiteboard answer:", error);
      setIsSubmitting(false);
      // Treat errors as incorrect
      onSubmit(false, "");
    },
  });

  const handleSubmit = () => {
    if (!problemText.trim() || isSubmitting || !isPracticeActive) {
      return;
    }

    setIsSubmitting(true);
    checkAnswerMutation.mutate({
      conversationId,
      problemText: problemText.trim(),
    });
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Main whiteboard area */}
      <div className="h-full">
        <DynamicWhiteboard conversationId={conversationId} />
      </div>
      {/* Submit button - positioned at bottom right */}
      {isPracticeActive && (
        <div className="absolute right-4 bottom-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !problemText.trim()}
            size="lg"
            className="shadow-lg"
          >
            <Check className="mr-2 h-4 w-4" />
            {isSubmitting ? "Checking..." : "Submit"}
          </Button>
        </div>
      )}
    </div>
  );
}
