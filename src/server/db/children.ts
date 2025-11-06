import { sql } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./utils";
import { users } from "./auth";

export const children = createTable(
  "child",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    parentUserId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    preferredName: d.varchar({ length: 40 }).notNull(),
    lastName: d.varchar({ length: 40 }),
    grade: d.varchar({ length: 10 }),
    timezone: d.varchar({ length: 50 }),
    isActive: d.boolean().default(true).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("child_parent_user_id_idx").on(t.parentUserId),
    uniqueIndex("child_parent_name_unique_idx").on(
      t.parentUserId,
      t.preferredName,
    ),
  ],
);

export const tutorPersonas = createTable(
  "tutor_persona",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    childId: d
      .uuid()
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    displayName: d.varchar({ length: 30 }).notNull(),
    avatarUrl: d.varchar({ length: 255 }),
    style: d.jsonb("style_json").$type<Record<string, unknown>>().default({}),
    createdAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [index("tutor_persona_child_id_idx").on(t.childId)],
);

// Relations are defined in schema.ts to avoid circular dependencies
