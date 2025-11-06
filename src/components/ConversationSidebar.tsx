"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { ConversationList } from "@/components/ConversationList";

interface ConversationSidebarProps
  extends React.ComponentProps<typeof Sidebar> {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  ...props
}: ConversationSidebarProps) {
  const handleNewConversation = () => {
    onNewConversation();
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button variant="default" size="sm" onClick={handleNewConversation}>
            <Plus className="mr-1 h-4 w-4" />
            New
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ConversationList
          selectedConversationId={selectedConversationId}
          onSelectConversation={onSelectConversation}
        />
      </SidebarContent>
    </Sidebar>
  );
}
