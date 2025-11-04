### Phase 2 — Auth (next-auth + Postgres) ✅

**Goal:** Sign-in/out, session-in-context, DB-backed users.
**Tasks:**

- Configure providers (Email or OAuth minimal).
- Add Postgres adapter with Drizzle.
  **Acceptance Criteria:**
- `/api/auth/signin` flow works; `ctx.session.user.id` in tRPC.
- Protected procedure denies anonymous users; e2e happy-path passes.
