/**
 * Domain types for file uploads and OCR processing
 */

/**
 * Represents an uploaded image with OCR processing state
 */
export interface UploadedImage {
  fileId: string;
  blobUrl: string;
  ocrText?: string;
  ocrLatex?: string;
  isProcessingOcr?: boolean;
  ocrError?: string;
}
