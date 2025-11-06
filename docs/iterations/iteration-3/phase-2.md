# Phase 2 — tRPC Router: Children CRUD + Persona ✅

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
