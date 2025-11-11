import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  upsertMastery,
  getMasteryByUser,
  getSkillsByDomain,
} from "@/server/db/progress";
import { turns, conversations, skills } from "@/server/db/schema";
import { boards, boardSnapshots } from "@/server/db/schema";
import type { Evidence } from "@/types/progress";

const evidenceSchema = z.object({
  turnIds: z.array(z.string().uuid()),
  snapshotIds: z.array(z.string().uuid()),
  rubric: z.object({
    accuracy: z.number().min(0).max(1),
    method: z.string(),
    explanation: z.string(),
  }),
});

export const progressRouter = createTRPCRouter({
  updateMastery: protectedProcedure
    .input(
      z
        .object({
          skillId: z.string().uuid().optional(),
          skillKey: z.string().optional(),
          level: z.number().int().min(0).max(4),
          evidence: evidenceSchema.optional(),
        })
        .refine((data) => data.skillId || data.skillKey, {
          message: "Either skillId or skillKey must be provided",
        }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Resolve skillKey to skillId if needed
      let skillId = input.skillId;
      if (!skillId && input.skillKey) {
        const [skill] = await ctx.db
          .select({ id: skills.id })
          .from(skills)
          .where(eq(skills.key, input.skillKey))
          .limit(1);

        if (!skill) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Skill with key ${input.skillKey} not found`,
          });
        }
        skillId = skill.id;
      }

      if (!skillId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not resolve skill",
        });
      }

      // Validate evidence: ensure user owns all referenced turns and snapshots
      if (input.evidence) {
        // Validate turns
        if (input.evidence.turnIds.length > 0) {
          const userTurns = await ctx.db
            .select({ id: turns.id })
            .from(turns)
            .innerJoin(
              conversations,
              eq(turns.conversationId, conversations.id),
            )
            .where(
              and(
                eq(conversations.userId, userId),
                inArray(turns.id, input.evidence.turnIds),
              ),
            );

          if (userTurns.length !== input.evidence.turnIds.length) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Some referenced turns do not belong to you",
            });
          }
        }

        // Validate snapshots
        if (input.evidence.snapshotIds.length > 0) {
          const userSnapshots = await ctx.db
            .select({ id: boardSnapshots.id })
            .from(boardSnapshots)
            .innerJoin(boards, eq(boardSnapshots.boardId, boards.id))
            .innerJoin(
              conversations,
              eq(boards.conversationId, conversations.id),
            )
            .where(
              and(
                eq(conversations.userId, userId),
                inArray(boardSnapshots.id, input.evidence.snapshotIds),
              ),
            );

          if (userSnapshots.length !== input.evidence.snapshotIds.length) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Some referenced snapshots do not belong to you",
            });
          }
        }
      }

      // Upsert mastery
      await upsertMastery(ctx.db, {
        userId,
        skillId,
        level: input.level,
        evidence: input.evidence as Record<string, unknown> | undefined,
      });

      return { ok: true };
    }),

  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get all skills grouped by domain
    const skillsByDomain = await getSkillsByDomain(ctx.db);

    // Get all mastery records for the user
    const userMastery = await getMasteryByUser(ctx.db, userId);

    // Create a map of skillId -> mastery for quick lookup
    const masteryMap = new Map(userMastery.map((m) => [m.skillId, m]));

    // Combine skills with mastery data
    const domains: Array<{
      domain: string;
      gradeBand: string;
      skills: Array<{
        id: string;
        standardId: string;
        topic: string;
        subtopic: string | null;
        key: string;
        description: string | null;
        standard: {
          id: string;
          domain: string;
          code: string;
          gradeBand: string;
          description: string | null;
        };
        mastery: {
          id: string;
          level: 0 | 1 | 2 | 3 | 4;
          evidence: Record<string, unknown>;
          updatedAt: Date;
        } | null;
      }>;
    }> = skillsByDomain.map((domainGroup) => ({
      domain: domainGroup.domain,
      gradeBand: domainGroup.gradeBand,
      skills: domainGroup.skills.map((skill) => {
        const masteryRecord = masteryMap.get(skill.id);
        return {
          id: skill.id,
          standardId: skill.standardId,
          topic: skill.topic,
          subtopic: skill.subtopic,
          key: skill.key,
          description: skill.description,
          standard: skill.standard,
          mastery: masteryRecord
            ? {
                id: masteryRecord.id,
                level: masteryRecord.level as 0 | 1 | 2 | 3 | 4,
                evidence: masteryRecord.evidence,
                updatedAt: masteryRecord.updatedAt,
              }
            : null,
        };
      }),
    }));

    return { domains };
  }),

  getMiniSummary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get all mastery records for the user
    const userMastery = await getMasteryByUser(ctx.db, userId);

    // Filter recent updates (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentMastery = userMastery.filter(
      (m) => m.updatedAt >= sevenDaysAgo,
    );

    // Get all skills to join with mastery data
    const skillsByDomain = await getSkillsByDomain(ctx.db);
    const allSkills = skillsByDomain.flatMap((d) => d.skills);

    // Get top 3 skills by mastery level (recent updates preferred)
    const skillsWithMastery = userMastery
      .map((mastery) => {
        const skill = allSkills.find((s) => s.id === mastery.skillId);
        if (!skill) return null;
        return {
          id: skill.id,
          topic: skill.topic,
          subtopic: skill.subtopic,
          key: skill.key,
          masteryLevel: mastery.level as 0 | 1 | 2 | 3 | 4,
          updatedAt: mastery.updatedAt,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 3);

    // Calculate overall progress
    const totalPracticed = userMastery.length;
    const averageMastery =
      totalPracticed > 0
        ? userMastery.reduce((sum, m) => sum + m.level, 0) / totalPracticed / 4
        : 0;
    const overallProgress = Math.round(averageMastery * 100);

    return {
      recentSkills: skillsWithMastery,
      overallProgress,
      totalSkillsPracticed: totalPracticed,
    };
  }),
});
