"use client";

import Image from "next/image";

import { UploadDropzone } from "./UploadDropzone";
import { ChatPane } from "./ChatPane";
import { MathRenderer } from "./MathRenderer";
import type { UploadedImage } from "@/types/files";

interface ProblemPanelProps {
  conversationId: string;
  uploadedImages: UploadedImage[];
  onUploadSuccess: (fileId: string, blobUrl: string) => void;
  onUploadError: (error: Error) => void;
}

/**
 * ProblemPanel component for conversation path
 * Displays upload area, OCR results, and chat interface
 */
export function ProblemPanel({
  conversationId,
  uploadedImages,
  onUploadSuccess,
  onUploadError,
}: ProblemPanelProps) {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-4xl font-bold">Tutor</h1>
        <p className="text-muted-foreground mt-4">
          Upload a screenshot or type your math problem to get started.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Mode: Conversation help
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <UploadDropzone
            conversationId={conversationId}
            onUploadSuccess={onUploadSuccess}
            onUploadError={onUploadError}
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
                    <Image
                      src={image.blobUrl}
                      alt="Uploaded problem"
                      width={600}
                      height={600}
                      className="h-auto max-h-[600px] w-full object-contain"
                      unoptimized
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
            <ChatPane conversationId={conversationId} />
          </div>
        </div>
      </div>
    </div>
  );
}
