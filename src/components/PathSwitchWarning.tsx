"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface PathSwitchWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * PathSwitchWarning component - warning dialog when switching to whiteboard mode
 * Explains that chat will be ephemeral and only problem + results are saved
 */
export function PathSwitchWarning({
  open,
  onOpenChange,
  onConfirm,
}: PathSwitchWarningProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-destructive h-5 w-5" />
            <DialogTitle>Switch to Whiteboard Practice Mode?</DialogTitle>
          </div>
          <DialogDescription>
            This mode has different data persistence than Conversation mode.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">What&apos;s NOT saved:</p>
            <ul className="text-muted-foreground ml-4 list-disc space-y-1 text-sm">
              <li>Chat messages (conversation with tutor)</li>
              <li>Temporary hints and questions</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">What IS saved:</p>
            <ul className="text-muted-foreground ml-4 list-disc space-y-1 text-sm">
              <li>Problem statement</li>
              <li>Practice session results (score, mastery, attempts)</li>
              <li>Time on task and metrics</li>
              <li>Whiteboard drawings (optional snapshot)</li>
            </ul>
          </div>
          <div className="rounded-lg border border-amber-500/50 bg-amber-50/50 p-3 dark:bg-amber-950/20">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <strong>Note:</strong> Your chat messages in this mode are
              temporary and will be cleared when you navigate away or refresh
              the page.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

