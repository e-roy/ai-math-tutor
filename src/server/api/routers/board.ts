import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { boards } from "@/server/db/schema";

export const boardRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Mock implementation - returns default board state
      // TODO: Query actual board from database in later phase
      const [board] = await ctx.db
        .select()
        .from(boards)
        .where(eq(boards.conversationId, input.conversationId))
        .limit(1);

      if (board) {
        return {
          scene: board.scene ?? {},
          version: board.version ?? 1,
        };
      }

      // Return default empty board if none exists
      return {
        scene: {},
        version: 1,
      };
    }),

  save: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        scene: z.any(),
        version: z.number().int().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Mock implementation - would update board in database
      // TODO: Implement actual database update with optimistic locking in later phase
      return { ok: true };
    }),

  snapshot: protectedProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        version: z.number().int().min(1),
        scene: z.any(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Mock implementation - would create snapshot in database
      // TODO: Implement actual snapshot creation in later phase
      const mockSnapshotId = crypto.randomUUID();
      return { snapshotId: mockSnapshotId };
    }),
});

