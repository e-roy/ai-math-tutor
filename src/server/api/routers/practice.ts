import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  createPracticeSession,
  getPracticeSessionById,
  getPracticeSessionsByConversation,
  getPracticeSessionsByUser,
  practiceSessions,
} from "@/server/db/practice";
import { conversations } from "@/server/db/schema";
import { computeScore, extractExpectedAnswer } from "@/lib/grading/equivalence";
import type { PracticeSession } from "@/types/practice";

export const practiceRouter = createTRPCRouter({
  createSession: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid().optional().nullable(),
        rawProblemText: z.string().min(1),
        attempts: z.number().int().min(0),
        hintsUsed: z.number().int().min(0),
        timeOnTaskMs: z.number().int().min(0),
        studentAnswer: z.string().optional().nullable(),
        expectedAnswer: z.string().optional().nullable(),
        boardSnapshotBlobRef: z.string().url().optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Verify conversation ownership if conversationId provided
      if (input.conversationId) {
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

        if (conversation.userId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this conversation",
          });
        }
      }

      // Extract expected answer from problem text if not provided
      let expectedAnswer = input.expectedAnswer;
      if (!expectedAnswer) {
        expectedAnswer = extractExpectedAnswer(input.rawProblemText) ?? null;
      }

      // Compute score and mastery using grading helper
      const gradingResult = computeScore(
        input.studentAnswer ?? null,
        expectedAnswer ?? null,
        input.attempts,
        input.hintsUsed,
      );

      // Create practice session
      const session = await createPracticeSession(ctx.db, {
        userId,
        conversationId: input.conversationId ?? null,
        rawProblemText: input.rawProblemText,
        attempts: input.attempts,
        hintsUsed: input.hintsUsed,
        timeOnTaskMs: input.timeOnTaskMs,
        completion: true,
        score: gradingResult.score,
        mastery: gradingResult.mastery,
        notes: input.notes ?? gradingResult.reason ?? null,
        boardSnapshotBlobRef: input.boardSnapshotBlobRef ?? null,
        studentAnswer: input.studentAnswer ?? null,
        expectedAnswer: expectedAnswer,
      });

      return session;
    }),

  finishSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        studentAnswer: z.string().optional().nullable(),
        boardSnapshotBlobRef: z.string().url().optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Get existing session (with auth check)
      const existingSession = await getPracticeSessionById(
        ctx.db,
        input.sessionId,
        userId,
      );

      if (!existingSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Practice session not found",
        });
      }

      // Update student answer if provided
      const studentAnswer =
        input.studentAnswer ?? existingSession.studentAnswer;

      // Recompute score and mastery with updated answer
      const gradingResult = computeScore(
        studentAnswer,
        existingSession.expectedAnswer,
        existingSession.attempts,
        existingSession.hintsUsed,
      );

      // Update session
      const [updated] = await ctx.db
        .update(practiceSessions)
        .set({
          studentAnswer: studentAnswer,
          boardSnapshotBlobRef:
            input.boardSnapshotBlobRef ??
            existingSession.boardSnapshotBlobRef,
          score: gradingResult.score.toString(),
          mastery: gradingResult.mastery,
          notes: gradingResult.reason,
          completion: true,
        })
        .where(eq(practiceSessions.id, input.sessionId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update practice session",
        });
      }

      return {
        id: updated.id,
        userId: updated.userId,
        createdAt: updated.createdAt,
        problemId: updated.problemId,
        conversationId: updated.conversationId,
        rawProblemText: updated.rawProblemText,
        attempts: updated.attempts,
        hintsUsed: updated.hintsUsed,
        timeOnTaskMs: updated.timeOnTaskMs,
        completion: updated.completion,
        score: updated.score ? Number(updated.score) : null,
        mastery: updated.mastery as PracticeSession["mastery"],
        notes: updated.notes,
        boardSnapshotBlobRef: updated.boardSnapshotBlobRef,
        studentAnswer: updated.studentAnswer,
        expectedAnswer: updated.expectedAnswer,
      };
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const session = await getPracticeSessionById(
        ctx.db,
        input.sessionId,
        userId,
      );

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Practice session not found",
        });
      }

      return session;
    }),

  getSessionsByConversation: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Verify conversation ownership
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

      if (conversation.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      const sessions = await getPracticeSessionsByConversation(
        ctx.db,
        input.conversationId,
        userId,
      );

      return sessions;
    }),

  getSessionsByUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const sessions = await getPracticeSessionsByUser(ctx.db, userId);

    return sessions;
  }),
});

