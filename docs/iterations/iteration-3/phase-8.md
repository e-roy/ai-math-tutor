# Phase 8 — Customize Tutor (Edit Name + Replace Avatar) ✅

**Description**
Allow the parent to edit the tutor’s display name and replace the avatar from the dashboard (e.g., action on ChildCard).

**Scope**

- Add “Customize Tutor” action on each child card.
- Dialog with fields:
  - Tutor name (zod-validated, 1–30)
  - Replace avatar (same blob flow as Phase 5)

- Submit:
  - `children.updateTutorName`
  - (optional) upload new avatar → `children.setTutorAvatarFromBlob`

**Files to touch**

- `/src/components/ChildCard.tsx` (add action)
- `/src/components/TutorPersonaForm.tsx` (new dialog)
- optional light updates in `/src/app/(app)/app/page.tsx` to wire dialogs

**Constraints**

- Keep files small; reuse wizard upload logic.
- Use React Query invalidation for `children.list()`.

**Acceptance Criteria**

- Editing name updates the list and Tutor header on next view.
- Replacing avatar updates the child card thumbnail and Tutor header.

**Out of scope**

- Deleting children (next phase).
