"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { TutorPath } from "@/types/conversation";

interface TutorHeaderProps {
  currentPath: TutorPath | null;

  tutorPersona?: {
    displayName: string;
    avatarUrl?: string;
  };
}

/**
 * TutorHeader component - header for tutor page with path switching
 */
export function TutorHeader({ currentPath, tutorPersona }: TutorHeaderProps) {
  return (
    <header className="bg-background flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-3">
            {tutorPersona && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {tutorPersona.avatarUrl ? (
                    <AvatarImage
                      src={tutorPersona.avatarUrl}
                      alt={tutorPersona.displayName}
                    />
                  ) : (
                    <AvatarFallback className="text-xs">
                      {tutorPersona.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h1 className="text-2xl font-semibold">
                    Tutoring with {tutorPersona.displayName}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {currentPath === "whiteboard"
                      ? "Practice mode - Chat is temporary"
                      : currentPath === "conversation"
                        ? "Conversation mode - All chat saved"
                        : "Select a conversation to get started"}
                  </p>
                </div>
              </div>
            )}
            {!tutorPersona && (
              <div>
                <h1 className="text-2xl font-semibold">Tutor</h1>
                <p className="text-muted-foreground text-sm">
                  {currentPath === "whiteboard"
                    ? "Practice mode - Chat is temporary"
                    : currentPath === "conversation"
                      ? "Conversation mode - All chat saved"
                      : "Select a conversation to get started"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
