"use client";

import { MessageSquare, PenTool } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TutorPath } from "@/types/conversation";

interface PathChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPath: (path: TutorPath) => void;
}

export function PathChooser({
  open,
  onOpenChange,
  onSelectPath,
}: PathChooserProps) {
  const handleSelect = (path: TutorPath) => {
    onSelectPath(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Choose a tutoring mode</DialogTitle>
          <DialogDescription>
            Select how you&apos;d like to work with the tutor
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 sm:grid-cols-2">
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
      </DialogContent>
    </Dialog>
  );
}
