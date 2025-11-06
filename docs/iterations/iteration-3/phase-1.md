# Phase 1 — Database: Children & Tutor Personas ✅

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
