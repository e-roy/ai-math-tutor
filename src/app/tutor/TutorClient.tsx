"use client";

import { useState, useEffect } from "react";

import dynamic from "next/dynamic";

import { api } from "@/trpc/react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ChatPane } from "@/components/ChatPane";
import { MathRenderer } from "@/components/MathRenderer";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { useChatStore } from "@/store/useChatStore";
import type { UploadedImage } from "@/types/files";

// Dynamically import Whiteboard to avoid SSR issues with Excalidraw
const Whiteboard = dynamic(
  () => import("@/components/Whiteboard").then((mod) => ({ default: mod.Whiteboard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] items-center justify-center rounded-xl border">
        <p className="text-muted-foreground">Loading whiteboard...</p>
      </div>
    ),
  },
);

export function TutorClient() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const parseImage = api.ocr.parseImage.useMutation();
  const setConversationId = useChatStore((state) => state.setConversationId);
  const resetConversation = useChatStore((state) => state.resetConversation);
  const clearTurns = useChatStore((state) => state.clearTurns);
  const setTurns = useChatStore((state) => state.setTurns);

  // Load turns when conversation is selected
  const { data: loadedTurns, isLoading: isLoadingTurns } = api.conversations.getTurns.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId },
  );

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
    setSelectedConversationId(conversationId);
  };

  const handleNewConversation = () => {
    // Reset state for new conversation
    resetConversation();
    clearTurns();
    setUploadedImages([]);
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

  return (
    <ConversationSidebar
      selectedConversationId={selectedConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
    >
      <SidebarInset>
        {!selectedConversationId ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">No conversation selected</h2>
              <p className="text-muted-foreground">
                Select a conversation from the sidebar or create a new one to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <div>
              <h1 className="text-4xl font-bold">Tutor</h1>
              <p className="text-muted-foreground mt-4">
                Upload a screenshot or type your math problem to get started.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <UploadDropzone
                  conversationId={selectedConversationId}
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                  className="max-w-2xl"
                />

          {uploadedImages.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Uploaded Images</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {uploadedImages.map((image) => (
                  <div
                    key={image.fileId}
                    className="border-border bg-muted/50 relative space-y-4 rounded-lg border p-4"
                  >
                    <img
                      src={image.blobUrl}
                      alt="Uploaded problem"
                      className="h-auto max-h-[600px] w-full object-contain"
                    />
                    <div className="space-y-2">
                      {image.isProcessingOcr && (
                        <div className="text-muted-foreground text-sm">
                          Processing image...
                        </div>
                      )}
                      {image.ocrError && (
                        <div className="text-destructive text-sm">
                          Error: {image.ocrError}
                        </div>
                      )}
                      {image.ocrText && !image.isProcessingOcr && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">
                            Extracted Text:
                          </div>
                          <div className="bg-background rounded-md border p-3 text-sm">
                            {image.ocrText}
                          </div>
                          {image.ocrLatex && (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">LaTeX:</div>
                              <div className="bg-background rounded-md border p-3">
                                <MathRenderer
                                  latex={image.ocrLatex}
                                  displayMode={true}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
              <div className="space-y-4">
                <div className="h-[600px] rounded-lg border">
                  <ChatPane conversationId={selectedConversationId} />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-semibold mb-4">Whiteboard</h2>
              <Whiteboard conversationId={selectedConversationId} />
            </div>
          </div>
        )}
      </SidebarInset>
    </ConversationSidebar>
  );
}
