import { z } from "zod";
import { eq, sql, desc, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { children, tutorPersonas } from "@/server/db/schema";

export const childrenRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    const results = await ctx.db
      .select({
        id: children.id,
        preferredName: children.preferredName,
        grade: children.grade,
        displayName: tutorPersonas.displayName,
        avatarUrl: tutorPersonas.avatarUrl,
      })
      .from(children)
      .leftJoin(tutorPersonas, eq(children.id, tutorPersonas.childId))
      .where(eq(children.parentUserId, ctx.session.user.id))
      .orderBy(desc(children.createdAt));

    // Transform results to match expected shape (persona may be null)
    return results.map((row) => ({
      id: row.id,
      preferredName: row.preferredName,
      grade: row.grade ?? undefined,
      persona: row.displayName
        ? {
            displayName: row.displayName,
            avatarUrl: row.avatarUrl ?? undefined,
          }
        : undefined,
    }));
  }),

  createWithPersona: protectedProcedure
    .input(
      z.object({
        preferredName: z.string().min(1).max(40),
        lastName: z.string().max(40).optional(),
        grade: z.string().max(10).optional(),
        timezone: z.string().max(50).optional(),
        tutorName: z.string().min(1).max(30),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Create child record first
      const [child] = await ctx.db
        .insert(children)
        .values({
          parentUserId: ctx.session.user.id,
          preferredName: input.preferredName,
          lastName: input.lastName ?? null,
          grade: input.grade ?? null,
          timezone: input.timezone ?? null,
        })
        .returning({ id: children.id });

      if (!child) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create child",
        });
      }

      // Create tutor persona
      await ctx.db.insert(tutorPersonas).values({
        childId: child.id,
        displayName: input.tutorName,
      });

      return { childId: child.id };
    }),

  updateChild: protectedProcedure
    .input(
      z.object({
        childId: z.string().uuid(),
        preferredName: z.string().min(1).max(40).optional(),
        lastName: z.string().max(40).optional(),
        grade: z.string().max(10).optional(),
        timezone: z.string().max(50).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Verify ownership
      const [child] = await ctx.db
        .select({ parentUserId: children.parentUserId })
        .from(children)
        .where(eq(children.id, input.childId))
        .limit(1);

      if (!child) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Child not found",
        });
      }

      if (child.parentUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this child",
        });
      }

      // Build update object with only provided fields
      const updateData: {
        preferredName?: string;
        lastName?: string | null;
        grade?: string | null;
        timezone?: string | null;
        updatedAt: SQL<unknown>;
      } = {
        updatedAt: sql`CURRENT_TIMESTAMP`,
      };

      if (input.preferredName !== undefined) {
        updateData.preferredName = input.preferredName;
      }
      if (input.lastName !== undefined) {
        updateData.lastName = input.lastName ?? null;
      }
      if (input.grade !== undefined) {
        updateData.grade = input.grade ?? null;
      }
      if (input.timezone !== undefined) {
        updateData.timezone = input.timezone ?? null;
      }

      await ctx.db
        .update(children)
        .set(updateData)
        .where(eq(children.id, input.childId));

      return { ok: true };
    }),

  deleteChild: protectedProcedure
    .input(z.object({ childId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Verify ownership
      const [child] = await ctx.db
        .select({ parentUserId: children.parentUserId })
        .from(children)
        .where(eq(children.id, input.childId))
        .limit(1);

      if (!child) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Child not found",
        });
      }

      if (child.parentUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this child",
        });
      }

      // Delete child (cascade will handle tutor persona)
      await ctx.db.delete(children).where(eq(children.id, input.childId));

      return { ok: true };
    }),

  getTutor: protectedProcedure
    .input(z.object({ childId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Verify ownership
      const [child] = await ctx.db
        .select({ parentUserId: children.parentUserId })
        .from(children)
        .where(eq(children.id, input.childId))
        .limit(1);

      if (!child) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Child not found",
        });
      }

      if (child.parentUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this child",
        });
      }

      // Get tutor persona
      const [persona] = await ctx.db
        .select({
          displayName: tutorPersonas.displayName,
          avatarUrl: tutorPersonas.avatarUrl,
        })
        .from(tutorPersonas)
        .where(eq(tutorPersonas.childId, input.childId))
        .limit(1);

      if (!persona) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tutor persona not found",
        });
      }

      return {
        displayName: persona.displayName,
        avatarUrl: persona.avatarUrl ?? undefined,
      };
    }),

  updateTutorName: protectedProcedure
    .input(
      z.object({
        childId: z.string().uuid(),
        displayName: z.string().min(1).max(30),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Verify ownership
      const [child] = await ctx.db
        .select({ parentUserId: children.parentUserId })
        .from(children)
        .where(eq(children.id, input.childId))
        .limit(1);

      if (!child) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Child not found",
        });
      }

      if (child.parentUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this child",
        });
      }

      // Update persona
      await ctx.db
        .update(tutorPersonas)
        .set({
          displayName: input.displayName,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(tutorPersonas.childId, input.childId));

      return { ok: true };
    }),

  setTutorAvatarFromBlob: protectedProcedure
    .input(
      z.object({
        childId: z.string().uuid(),
        blobUrl: z.string().url(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
      }

      // Verify ownership
      const [child] = await ctx.db
        .select({ parentUserId: children.parentUserId })
        .from(children)
        .where(eq(children.id, input.childId))
        .limit(1);

      if (!child) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Child not found",
        });
      }

      if (child.parentUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this child",
        });
      }

      // Update persona avatar
      await ctx.db
        .update(tutorPersonas)
        .set({
          avatarUrl: input.blobUrl,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(tutorPersonas.childId, input.childId));

      return { ok: true };
    }),
});
