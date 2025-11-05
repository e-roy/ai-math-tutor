import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./utils";
import { users } from "./auth";
import { conversations } from "./conversations";
import type { db } from "./index";

export const practiceSessions = createTable(
  "practice_session",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    problemId: d.uuid(),
    conversationId: d.uuid().references(() => conversations.id),
    rawProblemText: d.text().notNull(),
    attempts: d.integer().default(0).notNull(),
    hintsUsed: d.integer().default(0).notNull(),
    timeOnTaskMs: d.integer().notNull(),
    completion: d.boolean().default(false).notNull(),
    score: d.numeric({ precision: 3, scale: 2 }), // 0.00 to 1.00
    mastery: d.text(), // 'low' | 'medium' | 'high'
    notes: d.text(),
    boardSnapshotBlobRef: d.text(),
    studentAnswer: d.text(),
    expectedAnswer: d.text(),
  }),
  (t) => [
    index("practice_session_user_id_idx").on(t.userId),
    index("practice_session_conversation_id_idx").on(t.conversationId),
  ],
);

// Relations are defined in schema.ts to avoid circular dependencies

type Database = typeof db;

export interface PracticeSessionRecord {
  id: string;
  userId: string;
  createdAt: Date;
  problemId: string | null;
  conversationId: string | null;
  rawProblemText: string;
  attempts: number;
  hintsUsed: number;
  timeOnTaskMs: number;
  completion: boolean;
  score: number | null;
  mastery: "low" | "medium" | "high" | null;
  notes: string | null;
  boardSnapshotBlobRef: string | null;
  studentAnswer: string | null;
  expectedAnswer: string | null;
}

export interface CreatePracticeSessionParams {
  userId: string;
  conversationId?: string | null;
  rawProblemText: string;
  attempts: number;
  hintsUsed: number;
  timeOnTaskMs: number;
  completion?: boolean;
  score?: number | null;
  mastery?: "low" | "medium" | "high" | null;
  notes?: string | null;
  boardSnapshotBlobRef?: string | null;
  studentAnswer?: string | null;
  expectedAnswer?: string | null;
}

/**
 * Create a practice session
 */
export async function createPracticeSession(
  db: Database,
  params: CreatePracticeSessionParams,
): Promise<PracticeSessionRecord> {
  const [result] = await db
    .insert(practiceSessions)
    .values({
      userId: params.userId,
      conversationId: params.conversationId ?? null,
      rawProblemText: params.rawProblemText,
      attempts: params.attempts,
      hintsUsed: params.hintsUsed,
      timeOnTaskMs: params.timeOnTaskMs,
      completion: params.completion ?? false,
      score:
        params.score !== null && params.score !== undefined
          ? String(params.score)
          : null,
      mastery: params.mastery ?? null,
      notes: params.notes ?? null,
      boardSnapshotBlobRef: params.boardSnapshotBlobRef ?? null,
      studentAnswer: params.studentAnswer ?? null,
      expectedAnswer: params.expectedAnswer ?? null,
    })
    .returning();

  if (!result) {
    throw new Error("Failed to create practice session");
  }

  return {
    id: result.id,
    userId: result.userId,
    createdAt: result.createdAt,
    problemId: result.problemId,
    conversationId: result.conversationId,
    rawProblemText: result.rawProblemText,
    attempts: result.attempts,
    hintsUsed: result.hintsUsed,
    timeOnTaskMs: result.timeOnTaskMs,
    completion: result.completion,
    score: result.score ? Number(result.score) : null,
    mastery: result.mastery as "low" | "medium" | "high" | null,
    notes: result.notes,
    boardSnapshotBlobRef: result.boardSnapshotBlobRef,
    studentAnswer: result.studentAnswer,
    expectedAnswer: result.expectedAnswer,
  };
}

/**
 * Get a practice session by ID (with auth check)
 */
export async function getPracticeSessionById(
  db: Database,
  id: string,
  userId: string,
): Promise<PracticeSessionRecord | null> {
  const [result] = await db
    .select()
    .from(practiceSessions)
    .where(
      sql`${practiceSessions.id} = ${id} AND ${practiceSessions.userId} = ${userId}`,
    )
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    id: result.id as string,
    userId: result.userId as string,
    createdAt: result.createdAt as Date,
    problemId: result.problemId as string | null,
    conversationId: result.conversationId as string | null,
    rawProblemText: result.rawProblemText as string,
    attempts: result.attempts as number,
    hintsUsed: result.hintsUsed as number,
    timeOnTaskMs: result.timeOnTaskMs as number,
    completion: result.completion as boolean,
    score: result.score ? Number(result.score) : null,
    mastery: result.mastery as "low" | "medium" | "high" | null,
    notes: result.notes as string | null,
    boardSnapshotBlobRef: result.boardSnapshotBlobRef as string | null,
    studentAnswer: result.studentAnswer as string | null,
    expectedAnswer: result.expectedAnswer as string | null,
  };
}

/**
 * Get all practice sessions for a user
 */
export async function getPracticeSessionsByUser(
  db: Database,
  userId: string,
): Promise<PracticeSessionRecord[]> {
  const results = await db
    .select()
    .from(practiceSessions)
    .where(sql`${practiceSessions.userId} = ${userId}`)
    .orderBy(sql`${practiceSessions.createdAt} DESC`);

  return results.map((result) => ({
    id: result.id as string,
    userId: result.userId as string,
    createdAt: result.createdAt as Date,
    problemId: result.problemId as string | null,
    conversationId: result.conversationId as string | null,
    rawProblemText: result.rawProblemText as string,
    attempts: result.attempts as number,
    hintsUsed: result.hintsUsed as number,
    timeOnTaskMs: result.timeOnTaskMs as number,
    completion: result.completion as boolean,
    score: result.score ? Number(result.score) : null,
    mastery: result.mastery as "low" | "medium" | "high" | null,
    notes: result.notes as string | null,
    boardSnapshotBlobRef: result.boardSnapshotBlobRef as string | null,
    studentAnswer: result.studentAnswer as string | null,
    expectedAnswer: result.expectedAnswer as string | null,
  }));
}

/**
 * Get practice sessions for a conversation
 */
export async function getPracticeSessionsByConversation(
  db: Database,
  conversationId: string,
  userId: string,
): Promise<PracticeSessionRecord[]> {
  const results = await db
    .select()
    .from(practiceSessions)
    .where(
      sql`${practiceSessions.conversationId} = ${conversationId} AND ${practiceSessions.userId} = ${userId}`,
    )
    .orderBy(sql`${practiceSessions.createdAt} DESC`);

  return results.map((result) => ({
    id: result.id as string,
    userId: result.userId as string,
    createdAt: result.createdAt as Date,
    problemId: result.problemId as string | null,
    conversationId: result.conversationId as string | null,
    rawProblemText: result.rawProblemText as string,
    attempts: result.attempts as number,
    hintsUsed: result.hintsUsed as number,
    timeOnTaskMs: result.timeOnTaskMs as number,
    completion: result.completion as boolean,
    score: result.score ? Number(result.score) : null,
    mastery: result.mastery as "low" | "medium" | "high" | null,
    notes: result.notes as string | null,
    boardSnapshotBlobRef: result.boardSnapshotBlobRef as string | null,
    studentAnswer: result.studentAnswer as string | null,
    expectedAnswer: result.expectedAnswer as string | null,
  }));
}
