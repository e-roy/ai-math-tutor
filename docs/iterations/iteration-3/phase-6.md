# Phase 6 — Child Selector + Zustand Integration ✅

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
