Perfect—here’s a **phase-by-phase plan** tailored for an AI Agent. Each phase has a **Goal, Tasks, and Acceptance Criteria** and (where relevant) includes **Drizzle schema snippets**, **Excalidraw integration notes**, and **tRPC API surfaces**. Keep the steps short and executable.

---

### Phase 0 — Bootstrap & Baseline

**Goal:** Create a clean T3 app baseline with required libraries.
**Tasks:**

* `pnpm create t3-app@latest` (App Router, tRPC, next-auth, Tailwind).
* Install: `drizzle-orm drizzle-kit @neondatabase/serverless pg`, `@vercel/ai`, `@excalidraw/excalidraw`, `katex mathjs`, `zustand`, `@t3-oss/env-nextjs` (or `envsafe`).
* Set strict TS, ESLint, Prettier; ensure `pnpm dev` works.
  **Acceptance Criteria:**
* App boots to a landing page with no TS/lint errors.
* Tailwind + shadcn components render.
* `@/server/api/trpc` present and compiles.

---

### Phase 1 — Env & Config

**Goal:** Centralized env validation with fail-fast on missing secrets.
**Tasks:**

* Add server/client env schema (`OPENAI_API_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
* Document `.env.local.example`.
  **Acceptance Criteria:**
* Starting the app without required envs throws a clear error.
* `env` types usable in server code (no `process.env.X` scattered).

---

### Phase 2 — Auth (next-auth + Postgres)

**Goal:** Sign-in/out, session-in-context, DB-backed users.
**Tasks:**

* Configure providers (Email or OAuth minimal).
* Add Postgres adapter with Drizzle.
  **Acceptance Criteria:**
* `/api/auth/signin` flow works; `ctx.session.user.id` in tRPC.
* Protected procedure denies anonymous users; e2e happy-path passes.

---

### Phase 3 — Database Foundations (Drizzle + Neon)

**Goal:** Core tables and migrations ready.
**Tasks:**

* Add base schema and migrations; connect to Neon.
  **Schema (minimal)**

```ts
// /db/schema.ts
import { pgTable, text, timestamp, jsonb, integer, uuid } from "drizzle-orm/pg-core";

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

* `drizzle-kit generate` + `migrate` run clean.
* One test insert/query per table passes.

---

### Phase 4 — Progress Model (Detailed, Ages 4–18)

**Goal:** Flexible mastery tracking across grade bands.
**Tasks:**

* Add standards/skills/mastery/milestones tables and migrations.
  **Schema**

```ts
export const standards = pgTable("standards", {
  id: uuid("id").defaultRandom().primaryKey(),
  domain: text("domain").notNull(),        // Number Sense, Algebra, etc.
  code: text("code").notNull(),            // e.g., G6.EE.1
  gradeBand: text("grade_band").notNull(), // K–2, 3–5, 6–8, 9–12
  description: text("description"),
});

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  standardId: uuid("standard_id").notNull(),
  topic: text("topic").notNull(),
  subtopic: text("subtopic"),
  key: text("skill_key").notNull(), // slug
  description: text("description"),
});

export const mastery = pgTable("mastery", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  skillId: uuid("skill_id").notNull(),
  level: integer("mastery_level").notNull().default(0), // 0-4
  evidence: jsonb("evidence_json").$type<any>().default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  evidence: jsonb("evidence_json").$type<any>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Acceptance Criteria:**

* CRUD operations for these tables succeed.
* Foreign key relationships enforced (by app logic if not using FK).

---

### Phase 5 — tRPC Router Scaffolding

**Goal:** Type-safe API surface with auth guards.
**Tasks:**

* Create routers: `ai`, `ocr`, `board`, `progress`, `files`.
* Add Zod input/output types; enforce auth on mutations.
  **Router Signatures (minimal)**

```ts
// ai.ts
export const aiRouter = createTRPCRouter({
  tutorTurn: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      userText: z.string().min(1).optional(),
      userLatex: z.string().optional(),
      fileId: z.string().uuid().optional()
    }))
    .mutation(/* stream via Vercel AI SDK */),
});

// ocr.ts
export const ocrRouter = createTRPCRouter({
  parseImage: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .mutation(/* OpenAI Vision */),
});

// board.ts
export const boardRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ conversationId: z.string().uuid() })).query(/* ... */),
  save: protectedProcedure.input(z.object({
    conversationId: z.string().uuid(),
    scene: z.any(),
    version: z.number().int().min(1)
  })).mutation(/* ... */),
  snapshot: protectedProcedure.input(z.object({
    boardId: z.string().uuid(), version: z.number().int().min(1), scene: z.any()
  })).mutation(/* ... */),
});

// progress.ts
export const progressRouter = createTRPCRouter({
  updateMastery: protectedProcedure.input(z.object({
    userId: z.string(),
    skillId: z.string().uuid(),
    level: z.number().int().min(0).max(4),
    evidence: z.any().optional()
  })).mutation(/* ... */),
  getOverview: protectedProcedure.query(/* ... */),
});

// files.ts
export const filesRouter = createTRPCRouter({
  getUploadUrl: protectedProcedure
    .mutation(/* Vercel Blob signed upload */),
  finalize: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid(), blobUrl: z.string().url() }))
    .mutation(/* create files row */),
});
```

**Acceptance Criteria:**

* Routers compile; mock logic returns shape-correct data.
* Auth-protected routes reject unauthenticated requests.

---

### Phase 6 — UI Shell & Navigation

**Goal:** Layout + pages with shadcn and protected areas.
**Tasks:**

* Layout (nav: Home, Tutor, Progress).
* Guard Tutor/Progress pages behind auth.
* Add Zustand for UI prefs (theme, font size).
  **Acceptance Criteria:**
* Authenticated users can navigate Tutor/Progress.
* Unauthenticated users are redirected to sign-in.

---

### Phase 7 — Uploads (Vercel Blob)

**Goal:** Students upload screenshots; store blob + file row.
**Tasks:**

* Dropzone UI (accept png/jpg).
* `files.getUploadUrl` → upload → `files.finalize` with `conversationId`.
* Preview uploaded image in chat pane.
  **Acceptance Criteria:**
* Successful upload persists `files` row.
* Blob is retrievable for OCR route.

---

### Phase 8 — OCR via Vision LLM

**Goal:** Extract math problem text (printed-first).
**Tasks:**

* `ocr.parseImage(fileId)` fetches blob → OpenAI Vision → returns parsed text + optional LaTeX.
* Save `ocr_text` back to `files`.
  **Acceptance Criteria:**
* For clear printed examples, result contains legible text suitable for tutoring.
* Errors surfaced as user-friendly messages.

---

### Phase 9 — Tutor Core (Socratic, Streamed)

**Goal:** Multi-turn Socratic dialogue without giving answers.
**Tasks:**

* `ai.tutorTurn` uses Vercel AI SDK; system prompt enforces Socratic style.
* “Turn classifier” tool: `{type: 'ask'|'hint'|'validate'|'refocus'}` to guide UI.
* Persist `turns` with role, text, latex, tool metadata.
  **Acceptance Criteria:**
* Conversations across 5+ problem types complete without direct answers.
* Classifier tags each assistant turn; UI reflects (e.g., hint badge).
* Turns persist and reload on refresh.

---

### Phase 10 — Math Rendering & Input

**Goal:** Render math; capture/validate student responses.
**Tasks:**

* KaTeX wrapper for inline/block rendering.
* Answer box; parse numeric/algebraic using `mathjs`.
* Equivalence helper: simplify + randomized numeric checks; if inconclusive, LLM yes/no with JSON.
  **Acceptance Criteria:**
* LaTeX displays correctly in chat and side-panels.
* Simple algebra checks (e.g., `2x+5=13` → `x=4`) validate correctly.

---

### Phase 11 — Whiteboard (Excalidraw, Single-User + AI)

**Goal:** Embedded board with autosave and AI annotations.
**Tasks:**

* Add `Whiteboard` component using `@excalidraw/excalidraw`.
* Load latest scene by `conversationId`; throttle `onChange` → `board.save`.
* Minimal AI draw helpers: box, arrow, label; allow LaTeX→SVG insert (as image element with raw TeX in `customData`).
  **Implementation Notes**

```tsx
// /components/Whiteboard.tsx
import { Excalidraw } from "@excalidraw/excalidraw";
export function Whiteboard({ initialData, onChange, excalidrawRef }) {
  return (
    <div className="h-[70vh] border rounded-xl">
      <Excalidraw ref={excalidrawRef} initialData={initialData}
        onChange={(els, appState) => onChange?.({ els, appState })} />
    </div>
  );
}
```

**Acceptance Criteria:**

* Board state reloads across refresh and persists per conversation.
* “Add annotation” from AI visibly draws an element at the right moment.
* Snapshot endpoint creates a versioned row; “Revert to snapshot” restores state.

---

### Phase 12 — Progress Logic & UI

**Goal:** Update mastery levels with evidence; show overview.
**Tasks:**

* `progress.updateMastery({skillId, level, evidence})` called post-turn when student demonstrates skill.
* Evidence references `{ turnIds:[], snapshotIds:[], rubric:{accuracy, method, explanation} }`.
* Progress UI: per-domain overview, grade-band filter, skill drill-down.
  **Acceptance Criteria:**
* Updating mastery reflects immediately in UI.
* Evidence view links back to turns/board snapshots.

---

### Phase 13 — Conversation Management

**Goal:** Start/resume sessions cleanly.
**Tasks:**

* “New conversation” button; optional title auto-generated from first problem.
* Conversation list with timestamps, filters (topic/grade).
* Soft delete/archive.
  **Acceptance Criteria:**
* User can resume where they left off (loads board + turns).
* Title reflects problem content; archive hides from default list.

---

### Phase 14 — Voice (OpenAI)

**Goal:** Optional STT/TTS.
**Tasks:**

* Client recorder (MediaRecorder) → server → OpenAI Whisper → text to `ai.tutorTurn`.
* TTS: synthesize assistant turn audio via OpenAI TTS; play toggle on message.
  **Acceptance Criteria:**
* Speaking a question posts recognized text reliably.
* Assistant audio plays for streamed responses (post-completion is fine for MVP).

---

### Phase 15 — Validation & UX Polish

**Goal:** Guardrails and smooth UX.
**Tasks:**

* Zod validation on all tRPC inputs; unified error toasts.
* Loading states, optimistic board save, keyboard shortcuts (Enter to send, Cmd+K command bar optional).
  **Acceptance Criteria:**
* No unhandled rejections in console.
* Slow-network paths maintain usability (spinners/skeletons).

---

### Phase 16 — Deployment & Docs

**Goal:** Vercel deployment with clear setup.
**Tasks:**

* Vercel project; set envs; Neon pooling config.
* README: setup, envs, scripts, sample flows, troubleshooting.
* Minimal happy-path e2e (Playwright) for: login → upload → OCR → tutor turns → board save → progress update.
  **Acceptance Criteria:**
* Deployed URL passes the happy-path e2e.
* New dev can run locally in <10 minutes using README.

---

## Interaction Flow (Student ↔ AI Tutor) — Reference for the Agent

1. **Start/Resume** → fetch `conversation`, `turns`, `board.scene`.
2. **Intake** → text or upload; if upload, `files.getUploadUrl` → `files.finalize` → `ocr.parseImage`.
3. **Tutor Turn** → `ai.tutorTurn({ conversationId, userText/latex/fileId? })`

   * System prompt enforces Socratic style.
   * Tool call produces `{type:'ask'|'hint'|'validate'|'refocus'}`.
   * Persist assistant turn; UI badges by `type`.
4. **Student Response** → validate with mathjs (+ LLM fallback) → may call `progress.updateMastery`.
5. **Whiteboard** → AI may call `board.save` updates after injecting annotations; optionally `snapshot`.
6. **End/Resume** → conversation remains linked to progress and board state.

---

## Edge vs Node (decision baked in)

* **All tRPC procedures run on Node** for MVP (binary uploads, Vision calls, DB drivers).
* Split an Edge route later **only** if you need ultra-low-latency streaming.

---

## Rate Limiting (defer)

* Not required for a closed MVP.
* Add soft guards in tRPC context (e.g., per-user counters) and elevate to Redis/Upstash only when opening access.

---

If you want, I can turn this into a `phases.md` file and add starter files: `schema.ts`, router stubs, and the `Whiteboard` component scaffold you can paste directly.
