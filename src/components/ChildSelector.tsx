"use client";

import { useEffect } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/trpc/react";
import { useChildStore } from "@/store/useChildStore";

interface ChildSelectorProps {
  className?: string;
}

export function ChildSelector({ className }: ChildSelectorProps) {
  const currentChildId = useChildStore((state) => state.currentChildId);
  const setChildId = useChildStore((state) => state.setChildId);

  const { data: children, isLoading } = api.children.list.useQuery();

  // Pre-select currentChildId if it exists in the children list
  useEffect(() => {
    if (currentChildId && children) {
      const childExists = children.some((child) => child.id === currentChildId);
      if (!childExists) {
        // Clear selection if child no longer exists
        setChildId(null);
      }
    }
  }, [currentChildId, children, setChildId]);

  const handleValueChange = (value: string) => {
    setChildId(value);
    // No automatic navigation - user will use menu to go to tutor
  };

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (!children || children.length === 0) {
    return null;
  }

  const selectedChild = children.find((child) => child.id === currentChildId);

  return (
    <Select
      value={currentChildId ?? undefined}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          {selectedChild && (
            <Avatar className="h-5 w-5">
              {selectedChild.persona?.avatarUrl ? (
                <AvatarImage
                  src={selectedChild.persona.avatarUrl}
                  alt={selectedChild.preferredName}
                />
              ) : (
                <AvatarFallback className="text-xs">
                  {selectedChild.preferredName.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
          )}
          <SelectValue placeholder="Select a child" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {children.map((child) => (
          <SelectItem key={child.id} value={child.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                {child.persona?.avatarUrl ? (
                  <AvatarImage
                    src={child.persona.avatarUrl}
                    alt={child.preferredName}
                  />
                ) : (
                  <AvatarFallback className="text-xs">
                    {child.preferredName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <span>{child.preferredName}</span>
              {child.grade && (
                <span className="text-muted-foreground text-xs">
                  (Grade {child.grade})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
