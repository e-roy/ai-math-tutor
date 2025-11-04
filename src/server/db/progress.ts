import { sql } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./utils";
import { users } from "./auth";

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
    evidence: d.jsonb("evidence_json").$type<Record<string, unknown>>().default({}),
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
    evidence: d.jsonb("evidence_json").$type<Record<string, unknown>>().default({}),
    createdAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [index("milestone_user_id_idx").on(t.userId)],
);

// Relations are defined in schema.ts to avoid circular dependencies

