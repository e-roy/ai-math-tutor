import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const filesRouter = createTRPCRouter({
  getUploadUrl: protectedProcedure.mutation(async ({ ctx }) => {
    // Mock implementation - returns mock upload URL
    // TODO: Implement Vercel Blob signed upload URL in later phase
    return {
      url: "https://mock-blob-url.example.com/upload",
      token: "mock-upload-token",
    };
  }),

  finalize: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        blobUrl: z.string().url(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Mock implementation - would create file row in database
      // TODO: Implement actual file creation in later phase
      const mockFileId = crypto.randomUUID();
      return { fileId: mockFileId };
    }),
});

