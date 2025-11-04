import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const ocrRouter = createTRPCRouter({
  parseImage: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Mock implementation - returns mock OCR results
      // TODO: Implement OpenAI Vision API in later phase
      return {
        text: "Mock OCR text: Solve for x: 2x + 5 = 13",
        latex: "2x + 5 = 13",
      };
    }),
});

