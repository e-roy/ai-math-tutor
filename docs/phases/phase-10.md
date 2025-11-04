### Phase 10 — Math Rendering & Input ✅

**Goal:** Render math; capture/validate student responses.
**Tasks:**

- KaTeX wrapper for inline/block rendering.
- Answer box; parse numeric/algebraic using `mathjs`.
- Equivalence helper: simplify + randomized numeric checks; if inconclusive, LLM yes/no with JSON.
  **Acceptance Criteria:**
- LaTeX displays correctly in chat and side-panels.
- Simple algebra checks (e.g., `2x+5=13` → `x=4`) validate correctly.
