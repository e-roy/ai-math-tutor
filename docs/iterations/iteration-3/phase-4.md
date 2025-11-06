# Phase 4 — Add Child Wizard (Step 1: Basics + Tutor Name) ✅

**Description**
Implement the first step of the add-child flow: create the child and initial tutor name (no avatar in this phase).

**Scope**

- Form fields: `preferredName` (required), `lastName?`, `grade?`, `timezone?`, `tutorName` (required but provide default placeholder).
- Submit → `children.createWithPersona`.

**Files to touch**

- `/src/app/(app)/app/child/new/page.tsx` **or** `/src/components/ChildWizard.tsx` (modal from dashboard)
- If modal, wire from `/src/app/(app)/app/page.tsx`

**Validation**

- Zod on the client matches server constraints; trim inputs.

**Acceptance Criteria**

- Submitting creates a child+persona in DB.
- On success, show toast and go to **Step 2** (avatar) or show a success screen with a “Continue” button.

**Out of scope**

- Avatar upload.
- Zustand selection.
