"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type Child = {
  id: string;
  preferredName: string;
  grade?: string;
  persona?: {
    displayName: string;
    avatarUrl?: string;
  };
};

interface SelectedChildHeaderProps {
  child: Child;
  onBack: () => void;
}

export function SelectedChildHeader({
  child,
  onBack,
}: SelectedChildHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          {child.persona?.avatarUrl ? (
            <AvatarImage
              src={child.persona.avatarUrl}
              alt={child.preferredName}
            />
          ) : (
            <AvatarFallback>
              {child.preferredName.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <p className="font-semibold">{child.preferredName}</p>
          {child.grade && (
            <p className="text-muted-foreground text-sm">Grade {child.grade}</p>
          )}
        </div>
      </div>
    </div>
  );
}
