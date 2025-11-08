"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useChildStore } from "@/store/useChildStore";
import type { TutorPath } from "@/types/conversation";

import { ChildrenList } from "./ChildrenList";
import { PathChooser } from "./PathChooser";
import { SelectedChildHeader } from "./SelectedChildHeader";

type Child = {
  id: string;
  preferredName: string;
  grade?: string;
  persona?: {
    displayName: string;
    avatarUrl?: string;
  };
};

interface AppClientProps {
  students: Child[];
}

const PATH_ROUTES: Record<TutorPath, string> = {
  conversation: "/app/conversation",
  whiteboard: "/app/whiteboard",
} as const;

export function AppClient({ students }: AppClientProps) {
  const router = useRouter();
  const setChildId = useChildStore((state) => state.setChildId);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const selectedChild = selectedChildId
    ? students.find((child) => child.id === selectedChildId)
    : null;

  const handleSelectChild = (childId: string) => {
    setSelectedChildId(childId);
  };

  const handleBack = () => {
    setSelectedChildId(null);
  };

  const handleSelectPath = (path: TutorPath) => {
    if (selectedChildId) {
      // Store the child ID before navigation
      setChildId(selectedChildId);
      // Navigate to the selected path
      router.push(PATH_ROUTES[path]);
    }
  };

  // Show PathChooser when a child is selected
  if (selectedChild) {
    return (
      <div className="flex flex-col items-center gap-8">
        <SelectedChildHeader child={selectedChild} onBack={handleBack} />
        <PathChooser onSelectPath={handleSelectPath} />
      </div>
    );
  }

  // Show children list when no child is selected
  return (
    <div className="flex flex-col items-center gap-12 text-center">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Welcome back!
        </h1>
        <p className="text-muted-foreground max-w-2xl text-xl">
          Choose your learning path to continue your math journey.
        </p>
      </div>
      <ChildrenList students={students} onSelectChild={handleSelectChild} />
    </div>
  );
}
