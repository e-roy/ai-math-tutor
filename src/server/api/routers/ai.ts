import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const aiRouter = createTRPCRouter({
  tutorTurn: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        userText: z.string().min(1).optional(),
        userLatex: z.string().optional(),
        fileId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Mock implementation - returns a simple response
      // TODO: Implement streaming via Vercel AI SDK in later phase
      const mockResponse =
        "Let's think about this step by step. What do you know about this problem?";

      // In real implementation, this would stream tokens via Vercel AI SDK
      // For now, return a mock response that matches expected shape
      return {
        text: mockResponse,
        // Stream would be handled differently in actual implementation
      };
    }),
});
