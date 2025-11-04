import { sql } from "drizzle-orm";
import { eq, desc } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./utils";
import { users } from "./auth";
import type { db } from "./index";

export const standards = createTable(
  "standard",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    domain: d.text().notNull(), // Number Sense, Algebra, etc.
    code: d.text().notNull(), // e.g., G6.EE.1
    gradeBand: d.text("grade_band").notNull(), // K–2, 3–5, 6–8, 9–12
    description: d.text(),
  }),
  (t) => [index("standard_grade_band_idx").on(t.gradeBand)],
);

export const skills = createTable(
  "skill",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    standardId: d
      .uuid("standard_id")
      .notNull()
      .references(() => standards.id),
    topic: d.text().notNull(),
    subtopic: d.text(),
    key: d.text("skill_key").notNull(), // slug
    description: d.text(),
  }),
  (t) => [
    index("skill_standard_id_idx").on(t.standardId),
    index("skill_key_idx").on(t.key),
  ],
);

export const mastery = createTable(
  "mastery",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    skillId: d
      .uuid("skill_id")
      .notNull()
      .references(() => skills.id),
    level: d.integer("mastery_level").notNull().default(0), // 0-4
    evidence: d
      .jsonb("evidence_json")
      .$type<Record<string, unknown>>()
      .default({}),
    updatedAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("mastery_user_id_idx").on(t.userId),
    index("mastery_skill_id_idx").on(t.skillId),
    uniqueIndex("mastery_user_skill_unique_idx").on(t.userId, t.skillId),
  ],
);

export const milestones = createTable(
  "milestone",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    title: d.text().notNull(),
    notes: d.text(),
    evidence: d
      .jsonb("evidence_json")
      .$type<Record<string, unknown>>()
      .default({}),
    createdAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [index("milestone_user_id_idx").on(t.userId)],
);

// Relations are defined in schema.ts to avoid circular dependencies

type Database = typeof db;

export interface UpsertMasteryParams {
  userId: string;
  skillId: string;
  level: number;
  evidence?: Record<string, unknown>;
}

export interface MasteryRecord {
  id: string;
  userId: string;
  skillId: string;
  level: number;
  evidence: Record<string, unknown>;
  updatedAt: Date;
}

export interface MasteryWithSkill {
  id: string;
  userId: string;
  skillId: string;
  level: number;
  evidence: Record<string, unknown>;
  updatedAt: Date;
  skill: {
    id: string;
    standardId: string;
    topic: string;
    subtopic: string | null;
    key: string;
    description: string | null;
  };
  standard: {
    id: string;
    domain: string;
    code: string;
    gradeBand: string;
    description: string | null;
  };
}

export interface SkillsByDomain {
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
  }>;
}

/**
 * Upsert a mastery record for a user and skill
 */
export async function upsertMastery(
  db: Database,
  params: UpsertMasteryParams,
): Promise<MasteryRecord> {
  const [result] = await db
    .insert(mastery)
    .values({
      userId: params.userId,
      skillId: params.skillId,
      level: params.level,
      evidence: params.evidence ?? {},
    })
    .onConflictDoUpdate({
      target: [mastery.userId, mastery.skillId],
      set: {
        level: params.level,
        evidence: params.evidence ?? {},
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning();

  if (!result) {
    throw new Error("Failed to upsert mastery");
  }

  return {
    id: result.id,
    userId: result.userId,
    skillId: result.skillId,
    level: result.level,
    evidence: result.evidence as Record<string, unknown>,
    updatedAt: result.updatedAt,
  };
}

/**
 * Get all mastery records for a user with skill and standard details
 */
export async function getMasteryByUser(
  db: Database,
  userId: string,
): Promise<MasteryWithSkill[]> {
  const results = await db
    .select({
      id: mastery.id,
      userId: mastery.userId,
      skillId: mastery.skillId,
      level: mastery.level,
      evidence: mastery.evidence,
      updatedAt: mastery.updatedAt,
      skill: {
        id: skills.id,
        standardId: skills.standardId,
        topic: skills.topic,
        subtopic: skills.subtopic,
        key: skills.key,
        description: skills.description,
      },
      standard: {
        id: standards.id,
        domain: standards.domain,
        code: standards.code,
        gradeBand: standards.gradeBand,
        description: standards.description,
      },
    })
    .from(mastery)
    .innerJoin(skills, eq(mastery.skillId, skills.id))
    .innerJoin(standards, eq(skills.standardId, standards.id))
    .where(eq(mastery.userId, userId))
    .orderBy(desc(mastery.updatedAt));

  return results.map((row) => ({
    id: row.id,
    userId: row.userId,
    skillId: row.skillId,
    level: row.level,
    evidence: row.evidence as Record<string, unknown>,
    updatedAt: row.updatedAt,
    skill: row.skill,
    standard: row.standard,
  }));
}

/**
 * Get all skills grouped by domain and grade band
 */
export async function getSkillsByDomain(
  db: Database,
): Promise<SkillsByDomain[]> {
  const allSkills = await db
    .select({
      id: skills.id,
      standardId: skills.standardId,
      topic: skills.topic,
      subtopic: skills.subtopic,
      key: skills.key,
      description: skills.description,
      standard: {
        id: standards.id,
        domain: standards.domain,
        code: standards.code,
        gradeBand: standards.gradeBand,
        description: standards.description,
      },
    })
    .from(skills)
    .innerJoin(standards, eq(skills.standardId, standards.id))
    .orderBy(standards.domain, standards.gradeBand, skills.topic);

  // Group by domain and gradeBand
  const grouped = new Map<string, SkillsByDomain>();

  for (const skill of allSkills) {
    // Extract values to avoid unsafe assignment
    const domain = String(skill.standard.domain);
    const gradeBand = String(skill.standard.gradeBand);
    const key = `${domain}|${gradeBand}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        domain,
        gradeBand,
        skills: [],
      });
    }
    grouped.get(key)!.skills.push({
      id: skill.id,
      standardId: skill.standardId,
      topic: skill.topic,
      subtopic: skill.subtopic,
      key: skill.key,
      description: skill.description,
      standard: skill.standard,
    });
  }

  return Array.from(grouped.values());
}
