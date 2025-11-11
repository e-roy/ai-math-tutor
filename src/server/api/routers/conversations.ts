import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { conversations } from "@/server/db/schema";
import { getTurnsByConversation } from "@/server/db/turns";
import type { TutorPath } from "@/types/conversation";

export const conversationsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z
        .object({
          title: z.string().optional(),
          path: z.enum(["conversation", "whiteboard"]).optional(),
        })
        .optional(),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new Error("Unauthorized");
      }

      const meta: Record<string, unknown> = {};
      if (input?.path) {
        meta.path = input.path;
      }
      // Set default difficulty to "balanced" for new conversations
      meta.difficulty = "balanced";

      const [conversation] = await ctx.db
        .insert(conversations)
        .values({
          userId: ctx.session.user.id,
          title: input?.title ?? null,
          meta: Object.keys(meta).length > 0 ? meta : {},
        })
        .returning({ id: conversations.id });

      if (!conversation) {
        throw new Error("Failed to create conversation");
      }

      return { conversationId: conversation.id };
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          archived: z.boolean().optional(),
          topic: z.string().optional(),
          grade: z.string().optional(),
          path: z.enum(["conversation", "whiteboard"]).optional(),
          includeNullPath: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      const conditions = [eq(conversations.userId, ctx.session.user.id)];

      // Filter by archived status (default to false if not specified)
      if (input?.archived !== undefined) {
        conditions.push(eq(conversations.archived, input.archived));
      } else {
        conditions.push(eq(conversations.archived, false));
      }

      // Filter by path (stored in meta)
      if (input?.path) {
        if (input?.includeNullPath) {
          // Include specified path OR null/undefined paths (legacy conversations)
          conditions.push(
            sql`(${conversations.meta}->>'path' = ${input.path} OR ${conversations.meta}->>'path' IS NULL)`,
          );
        } else {
          conditions.push(sql`${conversations.meta}->>'path' = ${input.path}`);
        }
      }

      // Filter by topic (stored in meta)
      if (input?.topic) {
        conditions.push(sql`${conversations.meta}->>'topic' = ${input.topic}`);
      }

      // Filter by grade (stored in meta)
      if (input?.grade) {
        conditions.push(sql`${conversations.meta}->>'grade' = ${input.grade}`);
      }

      const results = await ctx.db
        .select({
          id: conversations.id,
          title: conversations.title,
          meta: conversations.meta,
          archived: conversations.archived,
          createdAt: conversations.createdAt,
        })
        .from(conversations)
        .where(and(...conditions))
        .orderBy(desc(conversations.createdAt))
        .limit(100);

      return results;
    }),

  getById: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      const [conversation] = await ctx.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      return conversation;
    }),

  updateTitle: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        title: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Verify user owns the conversation
      const [conversation] = await ctx.db
        .select({ userId: conversations.userId })
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      const [updated] = await ctx.db
        .update(conversations)
        .set({ title: input.title })
        .where(eq(conversations.id, input.conversationId))
        .returning({ id: conversations.id, title: conversations.title });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update conversation title",
        });
      }

      return { id: updated.id, title: updated.title };
    }),

  update: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        path: z.enum(["conversation", "whiteboard"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Verify user owns the conversation
      const [conversation] = await ctx.db
        .select({ userId: conversations.userId, meta: conversations.meta })
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      // Update meta with new path if provided
      const meta = (conversation.meta as Record<string, unknown>) ?? {};
      if (input.path !== undefined) {
        meta.path = input.path;
      }

      const [updated] = await ctx.db
        .update(conversations)
        .set({ meta })
        .where(eq(conversations.id, input.conversationId))
        .returning({ id: conversations.id, meta: conversations.meta });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update conversation",
        });
      }

      return { id: updated.id, meta: updated.meta };
    }),

  updateDifficulty: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        difficulty: z.enum(["support", "balanced", "challenge"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Verify user owns the conversation
      const [conversation] = await ctx.db
        .select({ userId: conversations.userId, meta: conversations.meta })
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      // Update meta with new difficulty
      const meta = (conversation.meta as Record<string, unknown>) ?? {};
      meta.difficulty = input.difficulty;

      const [updated] = await ctx.db
        .update(conversations)
        .set({ meta })
        .where(eq(conversations.id, input.conversationId))
        .returning({ id: conversations.id, meta: conversations.meta });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update conversation difficulty",
        });
      }

      return { success: true, difficulty: input.difficulty };
    }),

  archive: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Verify user owns the conversation
      const [conversation] = await ctx.db
        .select({ userId: conversations.userId })
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      const [updated] = await ctx.db
        .update(conversations)
        .set({ archived: true })
        .where(eq(conversations.id, input.conversationId))
        .returning({ id: conversations.id, archived: conversations.archived });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to archive conversation",
        });
      }

      return { id: updated.id, archived: updated.archived };
    }),

  unarchive: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Verify user owns the conversation
      const [conversation] = await ctx.db
        .select({ userId: conversations.userId })
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      const [updated] = await ctx.db
        .update(conversations)
        .set({ archived: false })
        .where(eq(conversations.id, input.conversationId))
        .returning({ id: conversations.id, archived: conversations.archived });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unarchive conversation",
        });
      }

      return { id: updated.id, archived: updated.archived };
    }),

  getTurns: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Verify user owns the conversation
      const [conversation] = await ctx.db
        .select({ userId: conversations.userId })
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      // Get all turns for the conversation
      const turns = await getTurnsByConversation(ctx.db, input.conversationId);

      return turns;
    }),
});
