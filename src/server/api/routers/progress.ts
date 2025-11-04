import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const progressRouter = createTRPCRouter({
  updateMastery: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        skillId: z.string().uuid(),
        level: z.number().int().min(0).max(4),
        evidence: z.any().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Mock implementation - would upsert mastery in database
      // TODO: Implement actual mastery update with evidence in later phase
      return { ok: true };
    }),

  getOverview: protectedProcedure.query(async ({ ctx }) => {
    // Mock implementation - returns mock overview structure
    // TODO: Query actual domains, skills, and mastery from database in later phase
    return {
      domains: [],
      skills: [],
      mastery: [],
    };
  }),
});

