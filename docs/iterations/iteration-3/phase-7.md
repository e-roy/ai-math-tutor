# Phase 7 — Tutor Page: Persona Header ✅

**Description**
Display the selected child’s tutor persona (name + avatar) in the Tutor UI header. If no child is selected, prompt the parent to select one.

**Scope**

- Read `currentChildId` from Zustand.
- If null: render a centered prompt with a button to go to `/app` to select a child.
- If set: call `children.getTutor({ childId })` and show name/avatar in existing header (e.g., extend `TutorHeader.tsx` or a local header).

**Files to touch**

- `/src/app/(app)/tutor/page.tsx`
- Potentially `/src/components/TutorHeader.tsx` (if that already exists and is suitable)

**Constraints**

- No chat/LLM changes needed; purely presentational for persona.

**Acceptance Criteria**

- Tutor header shows the selected persona’s name + avatar.
- Null selection gently prompts redirection to dashboard.
