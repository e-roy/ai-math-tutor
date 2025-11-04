### Phase 15 — Validation & UX Polish

**Goal:** Guardrails and smooth UX.
**Tasks:**

* Zod validation on all tRPC inputs; unified error toasts.
* Loading states, optimistic board save, keyboard shortcuts (Enter to send, Cmd+K command bar optional).
  **Acceptance Criteria:**
* No unhandled rejections in console.
* Slow-network paths maintain usability (spinners/skeletons).
