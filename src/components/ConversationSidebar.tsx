"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ConversationList } from "@/components/ConversationList";

interface ConversationSidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  children: React.ReactNode;
}

export function ConversationSidebar({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  children,
}: ConversationSidebarProps) {
  const handleNewConversation = () => {
    onNewConversation();
  };

  return (
    <SidebarProvider>
      <Sidebar>
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
      {children}
      <SidebarTrigger />
    </SidebarProvider>
  );
}
