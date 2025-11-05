"use client";

import { MessageSquare, PenTool, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TutorPath } from "@/types/conversation";

interface PathSwitchProps {
  currentPath: TutorPath | null;
  onSwitchToConversation: () => void;
  onSwitchToWhiteboard: () => void;
}

/**
 * Get tooltip content for current path
 */
function getTooltipContent(path: TutorPath | null): string {
  switch (path) {
    case "conversation":
      return "Chat saved - All conversations are saved for review";
    case "whiteboard":
      return "Only problem + results saved - Chat is temporary";
    default:
      return "Select a mode to see what's saved";
  }
}

/**
 * PathSwitch component - allows switching between conversation and whiteboard modes
 * Shows current mode indicator and tooltip explaining persistence policy
 */
export function PathSwitch({
  currentPath,
  onSwitchToConversation,
  onSwitchToWhiteboard,
}: PathSwitchProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Current mode indicator */}
      {currentPath && (
        <div className="flex items-center gap-2">
          <Badge
            variant={currentPath === "conversation" ? "default" : "secondary"}
          >
            {currentPath === "conversation" ? (
              <>
                <MessageSquare className="mr-1 h-3 w-3" />
                Conversation
              </>
            ) : (
              <>
                <PenTool className="mr-1 h-3 w-3" />
                Practice
              </>
            )}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-3 w-3" />
                  <span className="sr-only">What&apos;s saved?</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{getTooltipContent(currentPath)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Switch buttons */}
      <div className="flex items-center gap-2">
        {currentPath !== "conversation" && (
          <Button variant="outline" size="sm" onClick={onSwitchToConversation}>
            <MessageSquare className="mr-1 h-4 w-4" />
            Conversation
          </Button>
        )}
        {currentPath !== "whiteboard" && (
          <Button variant="outline" size="sm" onClick={onSwitchToWhiteboard}>
            <PenTool className="mr-1 h-4 w-4" />
            Practice
          </Button>
        )}
      </div>
    </div>
  );
}
