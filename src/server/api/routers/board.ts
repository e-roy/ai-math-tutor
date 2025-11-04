import { z } from "zod";
import { eq, sql } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { boards, boardSnapshots } from "@/server/db/schema";
import { sceneToDbFormat } from "@/lib/whiteboard/scene-adapters";

export const boardRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [board] = await ctx.db
        .select()
        .from(boards)
        .where(eq(boards.conversationId, input.conversationId))
        .limit(1);

      if (board) {
        return {
          boardId: board.id,
          scene: board.scene ?? {},
          version: board.version ?? 1,
        };
      }

      // Return default empty board if none exists
      return {
        boardId: undefined,
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
      // Check if board exists
      const [existingBoard] = await ctx.db
        .select()
        .from(boards)
        .where(eq(boards.conversationId, input.conversationId))
        .limit(1);

      const sceneData = sceneToDbFormat(input.scene);

      if (existingBoard) {
        // Optimistic locking: check version matches
        if (existingBoard.version !== input.version) {
          throw new Error(
            `Version mismatch. Expected ${existingBoard.version}, got ${input.version}`,
          );
        }

        // Update existing board
        const [updated] = await ctx.db
          .update(boards)
          .set({
            scene: sceneData,
            version: input.version + 1,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(boards.id, existingBoard.id))
          .returning();

        if (!updated) {
          throw new Error("Failed to update board");
        }

        return {
          ok: true,
          boardId: updated.id,
          version: updated.version,
        };
      }

      // Create new board
      const [newBoard] = await ctx.db
        .insert(boards)
        .values({
          conversationId: input.conversationId,
          scene: sceneData,
          version: input.version + 1,
        })
        .returning();

      if (!newBoard) {
        throw new Error("Failed to create board");
      }

      return {
        ok: true,
        boardId: newBoard.id,
        version: newBoard.version,
      };
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
      // Verify board exists
      const [board] = await ctx.db
        .select()
        .from(boards)
        .where(eq(boards.id, input.boardId))
        .limit(1);

      if (!board) {
        throw new Error("Board not found");
      }

      // Create snapshot
      const sceneData = sceneToDbFormat(input.scene);
      const [snapshot] = await ctx.db
        .insert(boardSnapshots)
        .values({
          boardId: input.boardId,
          version: input.version,
          scene: sceneData,
        })
        .returning();

      if (!snapshot) {
        throw new Error("Failed to create snapshot");
      }

      return { snapshotId: snapshot.id };
    }),

  revert: protectedProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        snapshotId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Load snapshot
      const [snapshot] = await ctx.db
        .select()
        .from(boardSnapshots)
        .where(eq(boardSnapshots.id, input.snapshotId))
        .limit(1);

      if (!snapshot) {
        throw new Error("Snapshot not found");
      }

      if (snapshot.boardId !== input.boardId) {
        throw new Error("Snapshot does not belong to this board");
      }

      // Get current board version
      const [board] = await ctx.db
        .select()
        .from(boards)
        .where(eq(boards.id, input.boardId))
        .limit(1);

      if (!board) {
        throw new Error("Board not found");
      }

      // Restore board from snapshot
      const [updated] = await ctx.db
        .update(boards)
        .set({
          scene: snapshot.scene,
          version: (board.version ?? 1) + 1,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(boards.id, input.boardId))
        .returning();

      if (!updated) {
        throw new Error("Failed to revert board");
      }

      return {
        ok: true,
        boardId: updated.id,
        version: updated.version,
      };
    }),
});

