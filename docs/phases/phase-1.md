### Phase 1 — Env & Config ✅

**Goal:** Centralized env validation with fail-fast on missing secrets.
**Tasks:**

- Add server/client env schema (`OPENAI_API_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
- Document `.env.local.example`.
  **Acceptance Criteria:**
- Starting the app without required envs throws a clear error.
- `env` types usable in server code (no `process.env.X` scattered).
