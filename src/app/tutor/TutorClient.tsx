"use client";

import { useState, useEffect, useRef } from "react";

import { api } from "@/trpc/react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ChatPane } from "@/components/ChatPane";
import { useChatStore } from "@/store/useChatStore";
import type { UploadedImage } from "@/types/files";

export function TutorClient() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const hasInitiatedCreation = useRef(false);

  const createConversation = api.conversations.create.useMutation();
  const parseImage = api.ocr.parseImage.useMutation();

  useEffect(() => {
    // Create a new conversation on mount if we don't have one
    // Use ref to prevent multiple calls
    if (!hasInitiatedCreation.current && !createConversation.data) {
      hasInitiatedCreation.current = true;
      createConversation.mutate(undefined, {
        onSuccess: () => {
          // Mutation state will update automatically
        },
        onError: () => {
          // Reset on error so user can retry
          hasInitiatedCreation.current = false;
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const conversationId = createConversation.data?.conversationId ?? null;
  const setConversationId = useChatStore((state) => state.setConversationId);

  // Update store when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      setConversationId(conversationId);
    }
  }, [conversationId, setConversationId]);

  if (!conversationId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">
          {createConversation.isPending
            ? "Initializing session..."
            : createConversation.isError
              ? "Failed to initialize session. Please refresh the page."
              : "Initializing session..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Tutor</h1>
        <p className="text-muted-foreground mt-4">
          Upload a screenshot or type your math problem to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <UploadDropzone
            conversationId={conversationId}
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
                              <div className="bg-background rounded-md border p-3 font-mono text-sm">
                                {image.ocrLatex}
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
            <ChatPane conversationId={conversationId} />
          </div>
        </div>
      </div>
    </div>
  );
}
