"use client";

import { MessageSquare, PenTool } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TutorPath } from "@/types/conversation";

interface PathChooserProps {
  onSelectPath: (path: TutorPath) => void;
}

export function PathChooser({ onSelectPath }: PathChooserProps) {
  const handleSelect = (path: TutorPath) => {
    onSelectPath(path);
  };

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Card className="w-full max-w-[600px]">
        <CardHeader>
          <CardTitle>Choose a tutoring mode</CardTitle>
          <CardDescription>
            Select how you&apos;d like to work with the tutor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className="hover:border-primary cursor-pointer transition-all hover:shadow-md"
              onClick={() => handleSelect("conversation")}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-primary h-6 w-6" />
                  <CardTitle>Conversation help</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get guided help with step-by-step conversations. All chat
                  history is saved for review.
                </CardDescription>
              </CardContent>
            </Card>
            <Card
              className="hover:border-primary cursor-pointer transition-all hover:shadow-md"
              onClick={() => handleSelect("whiteboard")}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <PenTool className="text-primary h-6 w-6" />
                  <CardTitle>Whiteboard practice</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Practice problems with a whiteboard. Only problem and results
                  are saved, chat is temporary.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
