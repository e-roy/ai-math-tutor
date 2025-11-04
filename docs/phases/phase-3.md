### Phase 3 — Database Foundations (Drizzle + Neon) ✅

**Goal:** Core tables and migrations ready.
**Tasks:**

- Add base schema and migrations; connect to Neon.
  **Schema (minimal)**

```ts
// /db/schema.ts
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // from next-auth
  name: text("name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title"),
  meta: jsonb("meta_json").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const turns = pgTable("turns", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  text: text("text"),
  latex: text("latex"),
  tool: jsonb("tool_json").$type<any>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull(),
  blobUrl: text("blob_url").notNull(),
  kind: text("kind").notNull(), // 'upload' | 'export'
  ocrText: text("ocr_text"),
  meta: jsonb("meta_json").$type<any>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const boards = pgTable("boards", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull(),
  scene: jsonb("scene_json").$type<any>().default({}),
  version: integer("version").default(1),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const boardSnapshots = pgTable("board_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  boardId: uuid("board_id").notNull(),
  version: integer("version").notNull(),
  scene: jsonb("scene_json").$type<any>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Acceptance Criteria:**

- `drizzle-kit generate` + `migrate` run clean.
- One test insert/query per table passes.
