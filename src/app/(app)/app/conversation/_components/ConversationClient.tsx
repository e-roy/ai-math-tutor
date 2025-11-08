"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/trpc/react";
import { ProblemPanel } from "./ProblemPanel";
import { ConversationSidebar } from "./ConversationSidebar";
import { TutorHeader } from "./TutorHeader";
import { NavBar } from "@/app/(app)/_components/NavBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { useChatStore } from "@/store/useChatStore";
import { useChildStore } from "@/store/useChildStore";
import type { UploadedImage } from "@/types/files";
import { getConversationPath, type TutorPath } from "@/types/conversation";

export function ConversationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get("id");

  const currentChildId = useChildStore((state) => state.currentChildId);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(conversationIdFromUrl);

  const parseImage = api.ocr.parseImage.useMutation();
  const createConversation = api.conversations.create.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.conversationId);
      router.push(`/app/conversation?id=${data.conversationId}`);
    },
  });

  const setConversationId = useChatStore(
    (state) => state.setConversationId,
  ) as (id: string | null) => void;
  const setTurns = useChatStore((state) => state.setTurns) as (
    turns: ReturnType<typeof useChatStore.getState>["turns"],
  ) => void;

  const resetConversation = (): void => {
    const state = useChatStore.getState();
    (state.resetConversation as () => void)();
  };
  const clearTurns = (): void => {
    const state = useChatStore.getState();
    (state.clearTurns as () => void)();
  };

  // Fetch tutor persona when child is selected
  const { data: tutorPersona, isLoading: isTutorPersonaLoading } =
    api.children.getTutor.useQuery(
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

  // Update conversation ID in store when selected
  useEffect(() => {
    if (selectedConversationId) {
      setConversationId(selectedConversationId);
    }
  }, [selectedConversationId, setConversationId]);

  // Update store when turns are loaded
  useEffect(() => {
    if (loadedTurns && selectedConversationId) {
      setTurns(loadedTurns);
    }
  }, [loadedTurns, selectedConversationId, setTurns]);

  // Sync URL with selected conversation
  useEffect(() => {
    if (
      selectedConversationId &&
      conversationIdFromUrl !== selectedConversationId
    ) {
      router.push(`/app/conversation?id=${selectedConversationId}`);
    }
  }, [selectedConversationId, conversationIdFromUrl, router]);

  // Initialize from URL param
  useEffect(() => {
    if (
      conversationIdFromUrl &&
      conversationIdFromUrl !== selectedConversationId
    ) {
      setSelectedConversationId(conversationIdFromUrl);
    }
  }, [conversationIdFromUrl, selectedConversationId]);

  // Create conversation automatically if none selected
  useEffect(() => {
    if (
      !selectedConversationId &&
      !createConversation.isPending &&
      !conversationIdFromUrl
    ) {
      createConversation.mutate({ path: "conversation" });
    }
  }, [selectedConversationId, createConversation, conversationIdFromUrl]);

  const handleSelectConversation = (conversationId: string) => {
    // Reset state when switching conversations
    resetConversation();
    clearTurns();
    setUploadedImages([]);
    setSelectedConversationId(conversationId);
    router.push(`/app/conversation?id=${conversationId}`);
  };

  const handleNewConversation = () => {
    // Create new conversation with conversation path
    createConversation.mutate({ path: "conversation" });
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

  // Show loading state while creating conversation
  if (createConversation.isPending || !selectedConversationId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-semibold">Creating conversation...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  const currentPath: TutorPath = conversationData
    ? getConversationPath(conversationData.meta)
    : "conversation";

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
          <NavBar />
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <TutorHeader
                currentPath={currentPath}
                tutorPersona={tutorPersona}
              />
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
    </SidebarProvider>
  );
}
