"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterControlsProps {
  showArchived: boolean;
  onToggleArchived: () => void;
  topicFilter: string;
  onTopicFilterChange: (value: string) => void;
  gradeFilter: string;
  onGradeFilterChange: (value: string) => void;
  conversations: Array<{
    meta: Record<string, unknown> | null;
  }>;
}

export function FilterControls({
  showArchived,
  onToggleArchived,
  topicFilter,
  onTopicFilterChange,
  gradeFilter,
  onGradeFilterChange,
  conversations,
}: FilterControlsProps) {
  // Extract unique topics and grades from conversations for filter dropdowns
  const topics = Array.from(
    new Set(
      conversations
        .map((c) => (c.meta as { topic?: string })?.topic)
        .filter((t): t is string => !!t),
    ),
  ).sort();

  const grades = Array.from(
    new Set(
      conversations
        .map((c) => (c.meta as { grade?: string })?.grade)
        .filter((g): g is string => !!g),
    ),
  ).sort();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onToggleArchived}>
          {showArchived ? "Show Active" : "Show Archived"}
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <Select
          value={topicFilter || "__all__"}
          onValueChange={(val) =>
            onTopicFilterChange(val === "__all__" ? "" : val)
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
            onGradeFilterChange(val === "__all__" ? "" : val)
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
  );
}

