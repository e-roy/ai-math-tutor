### Phase 12 — Progress Logic & UI

**Goal:** Update mastery levels with evidence; show overview.
**Tasks:**

* `progress.updateMastery({skillId, level, evidence})` called post-turn when student demonstrates skill.
* Evidence references `{ turnIds:[], snapshotIds:[], rubric:{accuracy, method, explanation} }`.
* Progress UI: per-domain overview, grade-band filter, skill drill-down.
  **Acceptance Criteria:**
* Updating mastery reflects immediately in UI.
* Evidence view links back to turns/board snapshots.

