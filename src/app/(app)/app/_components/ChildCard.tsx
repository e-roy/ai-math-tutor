"use client";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useChildStore } from "@/store/useChildStore";

type Child = {
  id: string;
  preferredName: string;
  grade?: string;
  persona?: {
    displayName: string;
    avatarUrl?: string;
  };
};

interface ChildCardProps {
  child: Child;
  onCustomize: (childId: string) => void;
  onSelect?: (childId: string) => void;
}

export function ChildCard({ child, onCustomize, onSelect }: ChildCardProps) {
  const currentChildId = useChildStore((state) => state.currentChildId);
  const setChildId = useChildStore((state) => state.setChildId);

  const isSelected = currentChildId === child.id;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card selection if clicking on the customize button
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).tagName === "BUTTON"
    ) {
      return;
    }
    // If onSelect callback is provided, use it; otherwise use store-based behavior
    if (onSelect) {
      onSelect(child.id);
    } else {
      // Select the child (no navigation - user will use menu to go to tutor)
      setChildId(child.id);
    }
  };

  const handleCustomizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCustomize(child.id);
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-primary shadow-md ring-2" : "hover:border-primary/50"
      }`}
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {child.persona?.avatarUrl ? (
              <AvatarImage
                src={child.persona.avatarUrl}
                alt={child.preferredName}
              />
            ) : (
              <AvatarFallback className="text-lg">
                {child.preferredName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <CardTitle>{child.preferredName}</CardTitle>
            <CardDescription>
              {child.grade && `Grade ${child.grade}`}
              {child.grade && child.persona?.displayName && " • "}
              {child.persona?.displayName && (
                <span>Tutor: {child.persona.displayName}</span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleCustomizeClick}
        >
          <Settings className="mr-2 h-4 w-4" />
          Customize Tutor
        </Button>
      </CardContent>
    </Card>
  );
}
