"use client";

import dynamic from "next/dynamic";

// Dynamically import Whiteboard to avoid SSR issues with Excalidraw
const DynamicWhiteboard = dynamic(
  () =>
    import("@/app/(app)/app/whiteboard/_components/Whiteboard").then((mod) => ({
      default: mod.Whiteboard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] items-center justify-center rounded-xl border">
        <p className="text-muted-foreground">Loading whiteboard...</p>
      </div>
    ),
  },
);

interface WhiteboardPanelProps {
  conversationId: string;
}

/**
 * WhiteboardPanel component for whiteboard practice mode
 * Features:
 * - Large Excalidraw whiteboard (main focus)
 * - Submission is handled through the chat sidebar
 */
export function WhiteboardPanel({ conversationId }: WhiteboardPanelProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <DynamicWhiteboard conversationId={conversationId} />
    </div>
  );
}
