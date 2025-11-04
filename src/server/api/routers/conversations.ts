import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { conversations } from "@/server/db/schema";
import { getTurnsByConversation } from "@/server/db/turns";

export const conversationsRouter = createTRPCRouter({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new Error("Unauthorized");
    }

    const [conversation] = await ctx.db
      .insert(conversations)
      .values({
        userId: ctx.session.user.id,
      })
      .returning({ id: conversations.id });

    if (!conversation) {
      throw new Error("Failed to create conversation");
    }

    return { conversationId: conversation.id };
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
