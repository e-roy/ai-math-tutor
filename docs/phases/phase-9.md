### Phase 9 — Tutor Core (Socratic, Streamed) ✅

**Goal:** Multi-turn Socratic dialogue without giving answers.
**Tasks:**

- `ai.tutorTurn` uses Vercel AI SDK; system prompt enforces Socratic style.
- “Turn classifier” tool: `{type: 'ask'|'hint'|'validate'|'refocus'}` to guide UI.
- Persist `turns` with role, text, latex, tool metadata.
  **Acceptance Criteria:**
- Conversations across 5+ problem types complete without direct answers.
- Classifier tags each assistant turn; UI reflects (e.g., hint badge).
- Turns persist and reload on refresh.
