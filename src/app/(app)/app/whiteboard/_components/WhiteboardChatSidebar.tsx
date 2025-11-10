"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { EphemeralChatPane } from "./EphemeralChatPane";

interface WhiteboardChatSidebarProps {
  conversationId: string;
}

/**
 * WhiteboardChatSidebar component for whiteboard practice mode
 * Displays ephemeral chat in a sidebar panel
 */
export function WhiteboardChatSidebar({
  conversationId,
}: WhiteboardChatSidebarProps) {
  return (
    <Sidebar side="right" collapsible="offcanvas">
      <SidebarHeader>
        <div className="px-4 py-2">
          <h2 className="text-lg font-semibold">Practice Chat</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <EphemeralChatPane conversationId={conversationId} />
      </SidebarContent>
    </Sidebar>
  );
}
