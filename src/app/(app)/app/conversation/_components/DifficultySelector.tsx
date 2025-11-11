"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import type { DifficultyLevel } from "@/types/conversation";
import { useConversationStore } from "@/store/useConversationStore";

interface DifficultySelectorProps {
  conversationId: string;
  currentDifficulty?: DifficultyLevel;
}

const DIFFICULTY_OPTIONS: Array<{
  value: DifficultyLevel;
  label: string;
  description: string;
}> = [
  {
    value: "support",
    label: "More Support",
    description: "More hints and simpler steps. Best for learning new concepts.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Standard guidance with helpful hints when needed.",
  },
  {
    value: "challenge",
    label: "More Challenge",
    description: "Fewer hints and more independent thinking. Best for practice.",
  },
];

export function DifficultySelector({
  conversationId,
  currentDifficulty = "balanced",
}: DifficultySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { setDifficulty } = useConversationStore();
  
  const updateDifficultyMutation = api.conversations.updateDifficulty.useMutation({
    onSuccess: (data) => {
      setDifficulty(data.difficulty as DifficultyLevel);
    },
  });

  const handleDifficultyChange = (value: DifficultyLevel) => {
    updateDifficultyMutation.mutate({
      conversationId,
      difficulty: value,
    });
  };

  const currentOption = DIFFICULTY_OPTIONS.find(
    (opt) => opt.value === currentDifficulty,
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={updateDifficultyMutation.isPending}
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Difficulty:</span>
          <span className="font-medium">{currentOption?.label ?? "Balanced"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Tutoring Difficulty</h3>
            <p className="text-muted-foreground text-sm">
              Adjust how much guidance you'd like
            </p>
          </div>
          
          <Select
            value={currentDifficulty}
            onValueChange={handleDifficultyChange}
            disabled={updateDifficultyMutation.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {updateDifficultyMutation.isPending && (
            <p className="text-muted-foreground text-xs">Updating...</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

