# Phase 3 — Onboarding Empty State (Dashboard) ✅

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
