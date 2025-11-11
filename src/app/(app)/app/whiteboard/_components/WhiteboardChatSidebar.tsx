"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { EphemeralChatPane } from "./EphemeralChatPane";
import { useChatContext } from "./ChatContext";
import { usePracticeStore } from "@/store/usePracticeStore";
import { Clock } from "lucide-react";

interface WhiteboardChatSidebarProps {
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
 * WhiteboardChatSidebar component for whiteboard practice mode
 * Displays ephemeral chat in a sidebar panel
 */
export function WhiteboardChatSidebar({
  conversationId,
}: WhiteboardChatSidebarProps) {
  const { chatRef } = useChatContext();
  const isTimerRunning = usePracticeStore((state) => state.isTimerRunning);
  const elapsedTimeMs = usePracticeStore((state) => state.elapsedTimeMs);

  return (
    <Sidebar side="right" collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-lg font-semibold">Practice Chat</h2>
          {isTimerRunning && (
            <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatTime(elapsedTimeMs)}
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <EphemeralChatPane ref={chatRef} conversationId={conversationId} />
      </SidebarContent>
    </Sidebar>
  );
}
