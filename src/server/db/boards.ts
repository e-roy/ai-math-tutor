import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./utils";
import { conversations } from "./conversations";

export const boards = createTable(
  "board",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    conversationId: d
      .uuid()
      .notNull()
      .references(() => conversations.id),
    scene: d.jsonb().$type<unknown>().default({}),
    version: d.integer().default(1),
    updatedAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [index("board_conversation_id_idx").on(t.conversationId)],
);

export const boardSnapshots = createTable(
  "board_snapshot",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    boardId: d
      .uuid()
      .notNull()
      .references(() => boards.id),
    version: d.integer().notNull(),
    scene: d.jsonb().$type<unknown>().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("board_snapshot_board_id_idx").on(t.boardId),
    index("board_snapshot_version_idx").on(t.version),
  ],
);

// Relations are defined in schema.ts to avoid circular dependencies
