"use client";

import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface HintButtonProps {
  onRequestHint: () => void;
  disabled?: boolean;
  hintCount?: number;
}

export function HintButton({
  onRequestHint,
  disabled = false,
  hintCount = 0,
}: HintButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRequestHint}
              disabled={disabled}
              className="relative"
            >
              <Lightbulb className="h-4 w-4 text-yellow-500" />
            </Button>
            {hintCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 text-xs"
              >
                {hintCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Request Hint{hintCount > 0 && ` (${hintCount} used)`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

