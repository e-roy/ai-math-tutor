"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Calendar } from "lucide-react";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  // Fetch conversations (path === "conversation")
  const {
    data: conversations,
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = api.conversations.list.useQuery({
    archived: showArchived ? true : false,
    topic: topicFilter || undefined,
    grade: gradeFilter || undefined,
    path: "conversation",
  });

  // Fetch all conversations (to get legacy ones with null path)
  // Note: This includes all paths, so we filter client-side
  const { data: allConversationsData, isLoading: isLoadingLegacy } =
    api.conversations.list.useQuery({
      archived: showArchived ? true : false,
      topic: topicFilter || undefined,
      grade: gradeFilter || undefined,
    });

  // Fetch practice sessions (path === "whiteboard")
  const {
    data: practiceSessions,
    isLoading: isLoadingPractice,
    refetch: refetchPractice,
  } = api.conversations.list.useQuery({
    archived: showArchived ? true : false,
    topic: topicFilter || undefined,
    grade: gradeFilter || undefined,
    path: "whiteboard",
  });

  // Combine conversations (path === "conversation") with legacy conversations (path === null)
  // Filter out whiteboard ones from allConversationsData
  const allConversations = [
    ...(conversations ?? []),
    ...(allConversationsData ?? []).filter((c) => {
      const meta = c.meta;
      const path = meta?.path;
      // Include only null/undefined paths (legacy conversations)
      return path === null || path === undefined;
    }),
  ];

  const isLoading =
    isLoadingConversations || isLoadingLegacy || isLoadingPractice;

  const refetch = () => {
    void refetchConversations();
    void refetchPractice();
  };

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

  // Extract unique topics and grades from all items for filter dropdowns
  const allItems = [...allConversations, ...(practiceSessions ?? [])];
  const topics = Array.from(
    new Set(
      allItems
        .map((c) => (c.meta as { topic?: string })?.topic)
        .filter((t): t is string => !!t),
    ),
  ).sort();

  const grades = Array.from(
    new Set(
      allItems
        .map((c) => (c.meta as { grade?: string })?.grade)
        .filter((g): g is string => !!g),
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
            onValueChange={(val) =>
              setTopicFilter(val === "__all__" ? "" : val)
            }
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
            onValueChange={(val) =>
              setGradeFilter(val === "__all__" ? "" : val)
            }
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

      {/* Conversation Lists */}
      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {/* Conversations Section */}
          <div className="space-y-2">
            <h3 className="text-muted-foreground px-2 text-xs font-semibold uppercase">
              Conversations
            </h3>
            {isLoading && (
              <div className="text-muted-foreground py-4 text-center text-sm">
                Loading...
              </div>
            )}

            {!isLoading && allConversations.length === 0 && (
              <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                {showArchived
                  ? "No archived conversations"
                  : "No conversations yet"}
              </div>
            )}

            {!isLoading &&
              allConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group hover:bg-accent relative cursor-pointer rounded-lg border p-3 transition-colors",
                    selectedConversationId === conversation.id &&
                      "bg-accent border-primary",
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <h3 className="line-clamp-1 pr-8 text-sm font-medium">
                        {conversation.title ?? "Untitled Conversation"}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
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
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
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

          {/* Practice Sessions Section */}
          <div className="space-y-2">
            <h3 className="text-muted-foreground px-2 text-xs font-semibold uppercase">
              Practice Sessions
            </h3>
            {isLoading && (
              <div className="text-muted-foreground py-4 text-center text-sm">
                Loading...
              </div>
            )}

            {!isLoading &&
              (!practiceSessions || practiceSessions.length === 0) && (
                <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                  {showArchived
                    ? "No archived sessions"
                    : "No practice sessions yet"}
                </div>
              )}

            {!isLoading &&
              practiceSessions?.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "group hover:bg-accent relative cursor-pointer rounded-lg border p-3 transition-colors",
                    selectedConversationId === session.id &&
                      "bg-accent border-primary",
                  )}
                  onClick={() => onSelectConversation(session.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <h3 className="line-clamp-1 pr-8 text-sm font-medium">
                        {session.title ?? formatDate(session.createdAt)}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) =>
                          session.archived
                            ? handleUnarchive(session.id, e)
                            : handleArchive(session.id, e)
                        }
                        title={session.archived ? "Unarchive" : "Archive"}
                      >
                        {session.archived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(session.createdAt)}</span>
                      {(session.meta as { topic?: string })?.topic && (
                        <>
                          <span>•</span>
                          <span>
                            {(session.meta as { topic?: string }).topic}
                          </span>
                        </>
                      )}
                      {(session.meta as { grade?: string })?.grade && (
                        <>
                          <span>•</span>
                          <span>
                            {(session.meta as { grade?: string }).grade}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
