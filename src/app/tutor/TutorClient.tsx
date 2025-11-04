"use client";

import { useState, useEffect, useRef } from "react";

import { api } from "@/trpc/react";
import { UploadDropzone } from "@/components/UploadDropzone";

export function TutorClient() {
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ fileId: string; blobUrl: string }>
  >([]);
  const hasInitiatedCreation = useRef(false);

  const createConversation = api.conversations.create.useMutation();

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

  const handleUploadSuccess = (fileId: string, blobUrl: string) => {
    setUploadedImages((prev) => [...prev, { fileId, blobUrl }]);
  };

  const handleUploadError = (error: Error) => {
    console.error("Upload error:", error);
    // TODO: Show toast notification
  };

  const conversationId = createConversation.data?.conversationId ?? null;

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
                className="border-border bg-muted/50 relative overflow-hidden rounded-lg border"
              >
                <img
                  src={image.blobUrl}
                  alt="Uploaded problem"
                  className="h-auto max-h-[600px] w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
