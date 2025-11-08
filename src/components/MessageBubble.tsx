"use client";

import type { Turn } from "@/server/db/turns";
import type { TurnType } from "@/types/ai";
import { Badge } from "@/components/ui/badge";
import { MathRenderer } from "@/app/(app)/app/conversation/_components/MathRenderer";
import { MathText } from "@/app/(app)/app/conversation/_components/MathText";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  turn: Turn;
  turnType?: TurnType | null;
  isStreaming?: boolean;
  streamingText?: string;
}

const turnTypeLabels: Record<TurnType, string> = {
  ask: "Question",
  hint: "Hint",
  validate: "Checking",
  refocus: "Refocusing",
};

const turnTypeVariants: Record<TurnType, "default" | "secondary" | "outline"> =
  {
    ask: "default",
    hint: "secondary",
    validate: "outline",
    refocus: "outline",
  };

export function MessageBubble({
  turn,
  turnType,
  isStreaming = false,
  streamingText,
}: MessageBubbleProps) {
  const isUser = turn.role === "user";
  const displayText = isStreaming && streamingText ? streamingText : turn.text;
  const displayType = isStreaming
    ? turnType
    : ((turn.tool as { type?: TurnType })?.type ?? turnType);

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {!isUser && displayType && (
          <div className="mb-2">
            <Badge variant={turnTypeVariants[displayType]}>
              {turnTypeLabels[displayType]}
            </Badge>
          </div>
        )}
        {displayText && (
          <div>
            <MathText text={displayText} />
          </div>
        )}
        {turn.latex && (
          <div className="mt-2">
            <MathRenderer latex={turn.latex} displayMode={false} />
          </div>
        )}
        {isStreaming && (
          <span className="ml-1 inline-block animate-pulse">▊</span>
        )}
      </div>
    </div>
  );
}
