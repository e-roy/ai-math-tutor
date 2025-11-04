import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./utils";
import { users } from "./auth";

export const conversations = createTable(
  "conversation",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    title: d.text(),
    meta: d.jsonb().$type<Record<string, unknown>>().default({}),
    archived: d.boolean().default(false).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [index("conversation_user_id_idx").on(t.userId)],
);

export const turns = createTable(
  "turn",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    conversationId: d
      .uuid()
      .notNull()
      .references(() => conversations.id),
    role: d.text().notNull(), // 'user' | 'assistant'
    text: d.text(),
    latex: d.text(),
    tool: d.jsonb().$type<unknown>(),
    createdAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [index("turn_conversation_id_idx").on(t.conversationId)],
);

// Relations are defined in schema.ts to avoid circular dependencies
