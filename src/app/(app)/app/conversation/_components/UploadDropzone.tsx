"use client";

import { useState, useCallback } from "react";
import { put } from "@vercel/blob";
import { Upload } from "lucide-react";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { useConversationStore } from "@/store/useConversationStore";

interface UploadDropzoneProps {
  conversationId: string;
  className?: string;
}

export function UploadDropzone({
  conversationId,
  className,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const addUploadedImage = useConversationStore(
    (state) => state.addUploadedImage,
  );
  const updateUploadedImage = useConversationStore(
    (state) => state.updateUploadedImage,
  );

  const getUploadUrl = api.files.getUploadUrl.useMutation();
  const finalize = api.files.finalize.useMutation();
  const parseImage = api.ocr.parseImage.useMutation();

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      const imageTypeRegex = /^image\/(png|jpeg)$/;
      if (!imageTypeRegex.exec(file.type)) {
        console.error("Only PNG and JPEG images are allowed");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.error("File size must be less than 10MB");
        return;
      }

      setIsUploading(true);

      try {
        // Get upload URL from server
        const uploadInfo = await getUploadUrl.mutateAsync({
          filename: file.name,
          contentType: file.type as "image/png" | "image/jpeg",
        });

        // Upload file to Vercel Blob
        const blob = await put(uploadInfo.pathname, file, {
          access: "public",
          token: uploadInfo.token,
          contentType: uploadInfo.contentType,
        });

        // Finalize upload by creating file record
        const result = await finalize.mutateAsync({
          conversationId,
          blobUrl: blob.url,
        });

        // Add image to store with processing flag
        addUploadedImage({
          fileId: result.fileId,
          blobUrl: blob.url,
          isProcessingOcr: true,
        });

        // Call OCR to extract text from image
        try {
          const ocrResult = await parseImage.mutateAsync({
            fileId: result.fileId,
          });
          // Update image with OCR results
          updateUploadedImage(result.fileId, {
            ocrText: ocrResult.text,
            ocrLatex: ocrResult.latex,
            isProcessingOcr: false,
          });
        } catch (error) {
          // Update image with error state
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to extract text from image. Please try again.";
          updateUploadedImage(result.fileId, {
            isProcessingOcr: false,
            ocrError: errorMessage,
          });
        }
      } catch (error) {
        console.error(
          "Upload error:",
          error instanceof Error ? error.message : "Upload failed",
        );
      } finally {
        setIsUploading(false);
      }
    },
    [
      conversationId,
      getUploadUrl,
      finalize,
      parseImage,
      addUploadedImage,
      updateUploadedImage,
    ],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        isUploading && "pointer-events-none opacity-50",
        className,
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileInput}
        disabled={isUploading}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Upload image"
      />
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <Upload
          className={cn(
            "mb-2 h-8 w-8",
            isDragging ? "text-primary" : "text-muted-foreground",
          )}
        />
        <p className="text-sm font-medium">
          {isUploading
            ? "Uploading..."
            : isDragging
              ? "Drop image here"
              : "Drag & drop an image, or click to select"}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          PNG or JPEG (max 10MB)
        </p>
      </div>
    </div>
  );
}
