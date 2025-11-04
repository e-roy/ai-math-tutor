"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Calendar } from "lucide-react";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

  const { data: conversations, isLoading, refetch } = api.conversations.list.useQuery({
    archived: showArchived ? true : false,
    topic: topicFilter || undefined,
    grade: gradeFilter || undefined,
  });

  const archiveMutation = api.conversations.archive.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const unarchiveMutation = api.conversations.unarchive.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleArchive = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    archiveMutation.mutate({ conversationId });
  };

  const handleUnarchive = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    unarchiveMutation.mutate({ conversationId });
  };

  // Extract unique topics and grades from conversations for filter dropdowns
  const topics = Array.from(
    new Set(
      conversations
        ?.map((c) => (c.meta as { topic?: string })?.topic)
        .filter((t): t is string => !!t) ?? [],
    ),
  ).sort();

  const grades = Array.from(
    new Set(
      conversations
        ?.map((c) => (c.meta as { grade?: string })?.grade)
        .filter((g): g is string => !!g) ?? [],
    ),
  ).sort();

  return (
    <div className="flex h-full flex-col space-y-4 px-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Show Active" : "Show Archived"}
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <Select
            value={topicFilter || "__all__"}
            onValueChange={(val) => setTopicFilter(val === "__all__" ? "" : val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All topics</SelectItem>
              {topics.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={gradeFilter || "__all__"}
            onValueChange={(val) => setGradeFilter(val === "__all__" ? "" : val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All grades</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {isLoading && (
          <div className="text-muted-foreground text-center py-8 text-sm">
            Loading conversations...
          </div>
        )}

        {!isLoading && (!conversations || conversations.length === 0) && (
          <div className="text-muted-foreground text-center py-8 text-sm">
            {showArchived ? "No archived conversations" : "No conversations yet"}
          </div>
        )}

        {!isLoading &&
          conversations &&
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group relative cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent",
                selectedConversationId === conversation.id &&
                  "bg-accent border-primary",
              )}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-sm line-clamp-1 pr-8">
                    {conversation.title || "Untitled Conversation"}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) =>
                      conversation.archived
                        ? handleUnarchive(conversation.id, e)
                        : handleArchive(conversation.id, e)
                    }
                    title={conversation.archived ? "Unarchive" : "Archive"}
                  >
                    {conversation.archived ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(conversation.createdAt)}</span>
                  {(conversation.meta as { topic?: string })?.topic && (
                    <>
                      <span>•</span>
                      <span>
                        {(conversation.meta as { topic?: string }).topic}
                      </span>
                    </>
                  )}
                  {(conversation.meta as { grade?: string })?.grade && (
                    <>
                      <span>•</span>
                      <span>
                        {(conversation.meta as { grade?: string }).grade}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

