# Phase 1 — Database: Children & Tutor Personas

**Description**
Add minimal tables to support multiple children per parent and each child’s tutor persona (name + avatar). No UI or routers yet.

**Scope**

- Append tables to `/src/server/db/schema.ts`.
- Keep naming consistent with existing schema file.

**Files to touch**

- `/src/server/db/schema.ts` (append):
  - `children(id, parent_user_id, preferred_name, last_name?, grade?, timezone?, is_active, created_at, updated_at)`
  - `tutor_personas(id, child_id, display_name, avatar_url?, style_json?, created_at, updated_at)`
  - Optional unique index: `(parent_user_id, preferred_name)`

**Constraints**

- FK: `children.parent_user_id -> users.id (onDelete: cascade)`
- FK: `tutor_personas.child_id -> children.id (onDelete: cascade)`
- Length limits: preferred_name ≤ 40, display_name ≤ 30

**Acceptance Criteria**

- Drizzle migrations run successfully.
- TypeScript types are generated/valid.
- Foreign keys and cascade deletes are in place.

**Out of scope**

- No API/tRPC changes.
- No UI.

---

# Phase 2 — tRPC Router: Children CRUD + Persona

**Description**
Expose a small, auth-guarded tRPC surface to create/list/update/delete children and manage tutor persona (name + avatar URL).

**Scope**

- New router with zod validation and parent-ownership checks.
- Integrate with existing `root.ts`.

**Files to touch**

- `/src/server/api/routers/children.ts` (new)
  Procedures:
  - `list() -> { id, preferredName, grade?, persona: { displayName, avatarUrl? } }[]`
  - `createWithPersona({ preferredName, lastName?, grade?, timezone?, tutorName }) -> { childId }`
  - `updateChild({ childId, preferredName?, lastName?, grade?, timezone? }) -> { ok }`
  - `deleteChild({ childId }) -> { ok }`
  - `getTutor({ childId }) -> { displayName, avatarUrl? }`
  - `updateTutorName({ childId, displayName }) -> { ok }`
  - `setTutorAvatarFromBlob({ childId, blobUrl }) -> { ok }`

- `/src/server/api/root.ts` — add `children: childrenRouter`

**Constraints**

- All mutations are `protectedProcedure`.
- Authorization: `child.parentUserId === session.user.id`.
- Zod limits: preferredName 1–40, displayName 1–30.
- No analytics, no events.

**Acceptance Criteria**

- All procedures compile and return expected shapes.
- Unauthorized access returns errors.
- Basic unit smoke test (temporary call from a dev-only page is fine).

**Out of scope**

- UI, uploads, Zustand.

---

# Phase 3 — Onboarding Empty State (Dashboard)

**Description**
When a parent has 0 children, show an onboarding view with a CTA to start the Add Child flow. When ≥1, show standard dashboard shell (no selector yet).

**Scope**

- Read `children.list()` on the parent dashboard.
- Conditional rendering: empty state vs standard contents.

**Files to touch**

- `/src/app/(app)/app/page.tsx`
- `/src/components/EmptyState.tsx` (or inline JSX)

**UI/Copy**

- Title: “Let’s set up your family”
- Body: “Add your first child to create their personal tutor.”
- Primary button: “Add first child” (routes to the wizard page/flow)

**Constraints**

- No state management yet.
- Keep file ≤350 LOC. Use shadcn/ui components.

**Acceptance Criteria**

- Authenticated parent with no children sees the empty state and CTA.
- Parent with at least one child sees non-empty shell (placeholder grid/area).

**Out of scope**

- The actual wizard form, selector, uploads.

---

# Phase 4 — Add Child Wizard (Step 1: Basics + Tutor Name)

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

---

# Phase 5 — Avatar Upload (Vercel Blob via existing files flow)

**Description**
Attach an avatar to the tutor persona using your **existing** blob upload flow (`files.getUploadUrl() -> PUT -> files.finalize({ blobUrl })`). Then call `children.setTutorAvatarFromBlob`.

**Scope**

- Add **Step 2 – Tutor Look & Feel** to the wizard with:
  - Upload button (accept: `image/png,image/jpeg,image/webp`, max 3MB)
  - Live preview
  - “Save & continue”

**Files to touch**

- The same wizard component from Phase 4.

**Constraints**

- Reuse existing `files` tRPC instead of adding new blob endpoints.
- Store the final `blobUrl` on `tutor_personas.avatar_url`.
- Show friendly errors for type/size.

**Acceptance Criteria**

- Upload succeeds and persona `avatar_url` is set.
- Preview reflects the uploaded avatar.
- Finishing the wizard returns the parent to the dashboard or straight to Tutor page (decision in UX—either is fine).

**Out of scope**

- Child selection/state.
- Edit flow.

---

# Phase 6 — Child Selector + Zustand Integration

**Description**
Add a selector to choose the **active child** and store the selection in Zustand. Redirect the user into Tutor once selected.

**Scope**

- Add a global/in-dashboard **ChildSelector** (Combobox) bound to `children.list()`.
- Create `/src/store/useChildStore.ts` with `currentChildId` + `setChildId`.
- On selection, set store and route to `/src/app/(app)/tutor`.

**Files to touch**

- `/src/store/useChildStore.ts` (new)
- `/src/components/ChildSelector.tsx` (new)
- `/src/app/(app)/app/page.tsx` (render selector when children ≥ 1)

**Constraints**

- No persistence beyond in-memory (no cookies/localStorage).
- Clean fallbacks if `currentChildId` is null.

**Acceptance Criteria**

- Selector shows all children with avatar/name.
- Selecting a child sets `currentChildId` and navigates to Tutor.
- Subsequent visits to `/app` show selector pre-filled (if store still alive).

**Out of scope**

- Tutor header changes (that’s next).

---

# Phase 7 — Tutor Page: Persona Header

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

**Out of scope**

- Editing persona here.

---

# Phase 8 — Customize Tutor (Edit Name + Replace Avatar)

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

---

# Phase 9 — Delete Child (Cascade)

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

**Out of scope**

- Analytics, events, or recovery/undo.
