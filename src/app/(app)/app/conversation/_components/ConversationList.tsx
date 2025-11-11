"use client";

import { useState } from "react";

import { api } from "@/trpc/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FilterControls } from "./FilterControls";
import { ConversationItem } from "./ConversationItem";

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationList({
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");

  // Single query with server-side filtering
  const {
    data: conversations = [],
    isLoading,
    refetch,
  } = api.conversations.list.useQuery({
    archived: showArchived,
    topic: topicFilter || undefined,
    grade: gradeFilter || undefined,
    path: "conversation",
    includeNullPath: true, // Include legacy conversations
  });

  const archiveMutation = api.conversations.archive.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const unarchiveMutation = api.conversations.unarchive.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleArchive = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    archiveMutation.mutate({ conversationId });
  };

  const handleUnarchive = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    unarchiveMutation.mutate({ conversationId });
  };

  return (
    <div className="flex h-full flex-col space-y-4 px-2">
      <FilterControls
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        topicFilter={topicFilter}
        onTopicFilterChange={setTopicFilter}
        gradeFilter={gradeFilter}
        onGradeFilterChange={setGradeFilter}
        conversations={conversations}
      />

      {/* Conversation Lists */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          <h3 className="text-muted-foreground px-2 text-xs font-semibold uppercase">
            Conversations
          </h3>
          {isLoading && (
            <div className="text-muted-foreground py-4 text-center text-sm">
              Loading...
            </div>
          )}

          {!isLoading && conversations.length === 0 && (
            <div className="text-muted-foreground px-2 py-4 text-center text-sm">
              {showArchived
                ? "No archived conversations"
                : "No conversations yet"}
            </div>
          )}

          {!isLoading &&
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation.id}
                onSelect={() => onSelectConversation(conversation.id)}
                onArchive={(e) => handleArchive(conversation.id, e)}
                onUnarchive={(e) => handleUnarchive(conversation.id, e)}
              />
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}
