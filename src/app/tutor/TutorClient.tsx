"use client";

import { useState, useEffect } from "react";

import { api } from "@/trpc/react";
import { ProblemPanel } from "@/components/ProblemPanel";
import { WhiteboardPanel } from "@/components/WhiteboardPanel";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { TutorHeader } from "@/components/TutorHeader";
import { PathSwitchWarning } from "@/components/PathSwitchWarning";
import { PathChooser } from "@/components/PathChooser";
import { SidebarInset } from "@/components/ui/sidebar";
import { useChatStore } from "@/store/useChatStore";
import type { UploadedImage } from "@/types/files";
import { getConversationPath, type TutorPath } from "@/types/conversation";

export function TutorClient() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [selectedPath, setSelectedPath] = useState<TutorPath | null>(null);
  const [showPathSwitchWarning, setShowPathSwitchWarning] = useState(false);
  const [showPathChooser, setShowPathChooser] = useState(true); // Show on initial load

  const parseImage = api.ocr.parseImage.useMutation();
  const createConversation = api.conversations.create.useMutation({
    onSuccess: (data, variables) => {
      setSelectedConversationId(data.conversationId);
      if (variables && variables.path) {
        const path = variables.path as TutorPath;
        if (path === "conversation" || path === "whiteboard") {
          setSelectedPath(path);
        }
      }
    },
  });
  const setConversationId = useChatStore(
    (state) => state.setConversationId,
  ) as (id: string | null) => void;
  const setTurns = useChatStore((state) => state.setTurns) as (
    turns: ReturnType<typeof useChatStore.getState>["turns"],
  ) => void;
  // Extract methods directly from store state to avoid unsafe return errors
  // Store state first, then call methods with type assertion to avoid unsafe call errors
  const resetConversation = (): void => {
    const state = useChatStore.getState();
    (state.resetConversation as () => void)();
  };
  const clearTurns = (): void => {
    const state = useChatStore.getState();
    (state.clearTurns as () => void)();
  };

  // Load conversation data to get path
  const { data: conversationData } = api.conversations.getById.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId },
  );

  // Load turns when conversation is selected
  const { data: loadedTurns } = api.conversations.getTurns.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId },
  );

  // Update path when conversation data is loaded
  useEffect(() => {
    if (conversationData) {
      const meta = conversationData.meta as Record<string, unknown> | null;
      const path = getConversationPath(meta);
      setSelectedPath(path);
    } else {
      setSelectedPath(null);
    }
  }, [conversationData]);

  // Update store when turns are loaded
  useEffect(() => {
    if (loadedTurns && selectedConversationId) {
      setTurns(loadedTurns);
    }
  }, [loadedTurns, selectedConversationId, setTurns]);

  // Update conversation ID in store when selected
  useEffect(() => {
    if (selectedConversationId) {
      setConversationId(selectedConversationId);
    }
  }, [selectedConversationId, setConversationId]);

  const handleSelectConversation = (conversationId: string) => {
    // Reset state when switching conversations
    resetConversation();
    clearTurns();
    setUploadedImages([]);
    setSelectedPath(null);
    setSelectedConversationId(conversationId);
  };

  const handleNewConversation = () => {
    // Reset state for new conversation
    resetConversation();
    clearTurns();
    setUploadedImages([]);
    setSelectedPath(null);
    setSelectedConversationId(null);
  };

  const handleSwitchToWhiteboard = () => {
    // Show warning dialog when switching to whiteboard
    setShowPathSwitchWarning(true);
  };

  const handleSwitchToConversation = () => {
    // When switching to conversation, trigger new conversation creation
    // Reset state first
    resetConversation();
    clearTurns();
    setUploadedImages([]);
    setSelectedPath(null);
    setSelectedConversationId(null);
  };

  const handleConfirmSwitchToWhiteboard = () => {
    // Create new whiteboard conversation
    // Reset state first
    resetConversation();
    clearTurns();
    setUploadedImages([]);
    setSelectedPath(null);
    setSelectedConversationId(null);
    createConversation.mutate({ path: "whiteboard" });
  };

  const handleSelectPath = (path: TutorPath) => {
    // Close modal immediately before starting mutation
    setShowPathChooser(false);
    // Create conversation with selected path
    createConversation.mutate({ path });
  };

  const handleUploadSuccess = async (fileId: string, blobUrl: string) => {
    // Add image to state with processing flag
    setUploadedImages((prev) => [
      ...prev,
      { fileId, blobUrl, isProcessingOcr: true },
    ]);

    // Call OCR to extract text from image
    try {
      const result = await parseImage.mutateAsync({ fileId });
      // Update image with OCR results
      setUploadedImages((prev) =>
        prev.map((img) =>
          img.fileId === fileId
            ? {
                ...img,
                ocrText: result.text,
                ocrLatex: result.latex,
                isProcessingOcr: false,
              }
            : img,
        ),
      );
    } catch (error) {
      // Update image with error state
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to extract text from image. Please try again.";
      setUploadedImages((prev) =>
        prev.map((img) =>
          img.fileId === fileId
            ? {
                ...img,
                isProcessingOcr: false,
                ocrError: errorMessage,
              }
            : img,
        ),
      );
    }
  };

  const handleUploadError = (error: Error) => {
    console.error("Upload error:", error);
    // TODO: Show toast notification
  };

  // If no conversation selected, show only PathChooser (no sidebar, no content)
  // Don't show if we're currently creating a conversation
  if (!selectedConversationId && !createConversation.isPending) {
    return (
      <>
        <PathChooser
          open={showPathChooser}
          onOpenChange={setShowPathChooser}
          onSelectPath={handleSelectPath}
        />
      </>
    );
  }

  // Show loading state while creating conversation
  if (createConversation.isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-semibold">Creating conversation...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  // If whiteboard path, show WhiteboardPanel without sidebar
  if (selectedPath === "whiteboard" && selectedConversationId) {
    return (
      <>
        <WhiteboardPanel conversationId={selectedConversationId} />
        <PathSwitchWarning
          open={showPathSwitchWarning}
          onOpenChange={setShowPathSwitchWarning}
          onConfirm={handleConfirmSwitchToWhiteboard}
        />
      </>
    );
  }

  // If conversation path, show sidebar + ProblemPanel
  if (!selectedConversationId) {
    return null; // Should not reach here, but safety check
  }

  return (
    <ConversationSidebar
      selectedConversationId={selectedConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
    >
      <SidebarInset>
        {selectedConversationId && (
          <TutorHeader
            currentPath={selectedPath}
            onSwitchToConversation={handleSwitchToConversation}
            onSwitchToWhiteboard={handleSwitchToWhiteboard}
          />
        )}
        <ProblemPanel
          conversationId={selectedConversationId}
          uploadedImages={uploadedImages}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      </SidebarInset>
      <PathSwitchWarning
        open={showPathSwitchWarning}
        onOpenChange={setShowPathSwitchWarning}
        onConfirm={handleConfirmSwitchToWhiteboard}
      />
    </ConversationSidebar>
  );
}
