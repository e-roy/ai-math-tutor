"use client";

import { Archive, ArchiveRestore, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conversation: {
    id: string;
    title: string | null;
    meta: Record<string, unknown> | null;
    archived: boolean;
    createdAt: Date;
  };
  isSelected: boolean;
  onSelect: () => void;
  onArchive: (e: React.MouseEvent) => void;
  onUnarchive: (e: React.MouseEvent) => void;
}

export function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onArchive,
  onUnarchive,
}: ConversationItemProps) {
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

  return (
    <div
      className={cn(
        "group hover:bg-accent relative cursor-pointer rounded-lg border p-3 transition-colors",
        isSelected && "bg-accent border-primary",
      )}
      onClick={onSelect}
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
            onClick={
              conversation.archived
                ? onUnarchive
                : onArchive
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
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(conversation.createdAt)}</span>
          </div>
          {(conversation.meta as { topic?: string })?.topic && (
            <Badge variant="secondary" className="h-5 text-xs">
              {(conversation.meta as { topic?: string }).topic}
            </Badge>
          )}
          {(conversation.meta as { grade?: string })?.grade && (
            <Badge variant="outline" className="h-5 text-xs">
              {(conversation.meta as { grade?: string }).grade}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

