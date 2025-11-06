# Phase 9 — Delete Child (Cascade) ✅

**Description**
Enable deletion of a child with a 2-step confirm, cascading persona removal via FK.

**Scope**

- “Delete” action on ChildCard → confirm dialog (require typing the child’s preferred name to confirm).
- Call `children.deleteChild`.
- If the deleted child was currently selected, clear `currentChildId` and show an inline notice.

**Files to touch**

- `/src/components/ChildCard.tsx` (confirm + mutation)
- `/src/store/useChildStore.ts` (clear selection)

**Constraints**

- Ensure `children.list()` is invalidated after deletion.

**Acceptance Criteria**

- Child disappears from dashboard.
- If selected child deleted, store is cleared and Tutor page prompts for selection.
