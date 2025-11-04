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