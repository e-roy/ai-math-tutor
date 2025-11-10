"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { EphemeralChatPane } from "./EphemeralChatPane";
import type { Turn } from "@/server/db/turns";

interface WhiteboardChatSidebarProps {
  conversationId: string;
  problemText: string;
  isPracticeActive: boolean;
  onHintUsed: () => void;
  onChatAttempt: () => void;
  onTurnsChange: (turns: Turn[]) => void;
  triggerMessage?: string | null;
}

/**
 * WhiteboardChatSidebar component for whiteboard practice mode
 * Displays ephemeral chat in a sidebar panel
 */
export function WhiteboardChatSidebar({
  conversationId,
  problemText,
  isPracticeActive,
  onHintUsed,
  onChatAttempt,
  onTurnsChange,
  triggerMessage,
}: WhiteboardChatSidebarProps) {
  return (
    <Sidebar side="right" collapsible="offcanvas">
      <SidebarHeader>
        <div className="px-4 py-2">
          <h2 className="text-lg font-semibold">Practice Chat</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <EphemeralChatPane
          conversationId={conversationId}
          problemText={problemText}
          isPracticeActive={isPracticeActive}
          onHintUsed={onHintUsed}
          onChatAttempt={onChatAttempt}
          onTurnsChange={onTurnsChange}
          triggerMessage={triggerMessage}
        />
      </SidebarContent>
    </Sidebar>
  );
}
