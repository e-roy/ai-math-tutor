"use client";

import { useRouter } from "next/navigation";

import { PathChooser } from "./PathChooser";
import { useChildStore } from "@/store/useChildStore";
import { api } from "@/trpc/react";
import type { TutorPath } from "@/types/conversation";

export function TutorClient() {
  const router = useRouter();
  const currentChildId = useChildStore((state) => state.currentChildId);

  const { isLoading: isTutorPersonaLoading } = api.children.getTutor.useQuery(
    { childId: currentChildId! },
    { enabled: !!currentChildId },
  );

  const handleSelectPath = (path: TutorPath) => {
    // Navigate to the appropriate page based on selected path
    if (path === "conversation") {
      router.push("/tutor/conversation");
    } else if (path === "whiteboard") {
      router.push("/tutor/whiteboard");
    }
  };

  // Show loading state while checking if child data is available
  if (currentChildId && isTutorPersonaLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-semibold">Loading...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  // Show PathChooser to let user select conversation or whiteboard mode
  return <PathChooser onSelectPath={handleSelectPath} />;
}
