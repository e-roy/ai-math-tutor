import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./utils";
import { conversations } from "./conversations";

export const files = createTable(
  "file",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    conversationId: d
      .uuid()
      .notNull()
      .references(() => conversations.id),
    blobUrl: d.text().notNull(),
    kind: d.text().notNull(), // 'upload' | 'export'
    ocrText: d.text(),
    meta: d.jsonb().$type<unknown>(),
    createdAt: d
      .timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [index("file_conversation_id_idx").on(t.conversationId)],
);

// Relations are defined in schema.ts to avoid circular dependencies

