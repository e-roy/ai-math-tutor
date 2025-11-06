"use client";

import { useState, useEffect } from "react";

import { api } from "@/trpc/react";
import { ProblemPanel } from "@/components/ProblemPanel";
import { WhiteboardPanel } from "@/components/WhiteboardPanel";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { TutorHeader } from "@/components/TutorHeader";
import { NavBarClient } from "@/components/NavBarClient";
import { PathSwitchWarning } from "@/components/PathSwitchWarning";
import { PathChooser } from "@/components/PathChooser";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useChatStore } from "@/store/useChatStore";
import { useChildStore } from "@/store/useChildStore";
import Link from "next/link";
import type { UploadedImage } from "@/types/files";
import { getConversationPath, type TutorPath } from "@/types/conversation";
import type { Session } from "next-auth";

interface TutorClientProps {
  session: Session | null;
}

export function TutorClient({ session }: TutorClientProps) {
  const currentChildId = useChildStore((state) => state.currentChildId);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [selectedPath, setSelectedPath] = useState<TutorPath | null>(null);
  const [showPathSwitchWarning, setShowPathSwitchWarning] = useState(false);

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

  // Fetch tutor persona when child is selected
  const {
    data: tutorPersona,
    isLoading: isTutorPersonaLoading,
    isError: isTutorPersonaError,
  } = api.children.getTutor.useQuery(
    { childId: currentChildId! },
    { enabled: !!currentChildId },
  );

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
      const meta = conversationData.meta;
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

  // If no child is selected, or child data is not available, show prompt to select a child
  if (!currentChildId || isTutorPersonaError || !tutorPersona) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Select a Child</CardTitle>
            <CardDescription>
              Please select a child to start tutoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/app">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no conversation selected, show only PathChooser (no sidebar, no content)
  // Don't show if we're currently creating a conversation
  if (!selectedConversationId && !createConversation.isPending) {
    return <PathChooser onSelectPath={handleSelectPath} />;
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
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <SidebarInset>
            <NavBarClient session={session} />
            <WhiteboardPanel conversationId={selectedConversationId} />
          </SidebarInset>
        </SidebarProvider>
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
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <ConversationSidebar
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        variant="inset"
      />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <NavBarClient session={session} />
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {selectedConversationId && (
                <TutorHeader
                  currentPath={selectedPath}
                  onSwitchToConversation={handleSwitchToConversation}
                  onSwitchToWhiteboard={handleSwitchToWhiteboard}
                  tutorPersona={tutorPersona}
                />
              )}
              <ProblemPanel
                conversationId={selectedConversationId}
                uploadedImages={uploadedImages}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>
          </div>
        </div>
      </SidebarInset>

      <PathSwitchWarning
        open={showPathSwitchWarning}
        onOpenChange={setShowPathSwitchWarning}
        onConfirm={handleConfirmSwitchToWhiteboard}
      />
    </SidebarProvider>
  );
}
