# Phase 5 — Avatar Upload (Vercel Blob via existing files flow) ✅

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
