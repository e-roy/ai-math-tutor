import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { conversations } from "@/server/db/schema";

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
});
