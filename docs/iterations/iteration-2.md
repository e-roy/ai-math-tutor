You are implementing TWO entry paths on /tutor with different goals & persistence:

- **Conversation (Dashboard) Path**: sidebar → past conversations → problem-first tutoring with full chat history saved.
- **Whiteboard (Testing) Path**: whiteboard + ephemeral chat (NOT saved). Persist only: problem, attempts, results, understanding metrics.

### Global constraints

- Next.js/TS, shadcn+Tailwind, tRPC, Zustand, React Query, Excalidraw, Vercel Blob.
- No `any`. Files ≤ 350 LOC. Types in `/types`, helpers in `/lib`.

---

## Phase 1 — Path Selector + Sidebar semantics

- Add `Conversation.path: 'conversation' | 'whiteboard' | null`.
- Show **PathChooser** when creating new: “Conversation help” or “Whiteboard practice.”
- Sidebar:
  - List **only** conversation-path items under “Conversations”.
  - Add second list “Practice Sessions” for whiteboard path items (title = date or problem summary).
- Persist chosen path on creation; switching items restores the correct panel.
  **AC:** New item shows chooser → choosing renders correct panel; lists are separated.

## Phase 2 — Conversation Path (dashboard help)

- Render existing **ProblemPanel** (upload/paste + OCR → chat + MathAnswerBox).
- Persist full chat (user + assistant turns) as today.
- Keep turn labels, streaming, OCR, LaTeX.
  **AC:** Existing convo flow unchanged, lives under “Conversations”.

## Phase 3 — Whiteboard Path (testing mode)

- Render **WhiteboardPanel**: Excalidraw large; chat drawer minimized (ephemeral).
- **Do NOT save** chat turns. Keep in local component state only (clear on navigation/reload).
- Add a compact “Problem” header with:
  - Problem text/LaTeX (from selection or manual entry).
  - “Start Practice” → starts session timer.
  - “Finish & Submit” → opens results modal.
    **AC:** Whiteboard works; chat appears and is usable but leaves no DB trace.

## Phase 4 — Results & Understanding Metrics (persisted)

- New table `practice_sessions`:
  - `id, userId, createdAt, problemId|null, conversationId|null, rawProblemText, attempts:int, hintsUsed:int, timeOnTaskMs:int, completion:boolean, score:0..1, mastery: 'low'|'medium'|'high', notes, boardSnapshotBlobRef`
- Helper `/lib/grading/equivalence.ts`:
  - numeric equivalence (tolerance), fraction equivalence, simplify-to-zero.
- On submit:
  - Compute `score`, `mastery` via rubric (e.g., 1.0 exact, 0.7 equivalent, 0.4 partial, 0 fail).
  - Save counters (attempts, hintsUsed), `timeOnTaskMs`, and optional `boardSnapshot`.
    **AC:** Submitting creates a `practice_sessions` row with computed fields.

## Phase 5 — UX polish & switching

- Header **PathSwitch** (safe hot-swap):
  - If switching **to whiteboard**, warn that chat will be ephemeral.
  - If switching **to conversation**, route to new conversation create.
- Add tiny “What’s saved?” tooltip:
  - Conversation path: chat saved.
  - Whiteboard path: only problem + results saved.
    **AC:** Clear messaging; hot-swap without crashes; ephemeral policy obvious.

## tRPC endpoints (sketch)

- `conversations.create({ path })`
- `conversations.update({ id, path })`
- `practice.createSession(payload)`
- `practice.finishSession({ id, results })`

## Types (sketch)

/types/conversation.ts

````ts
export type TutorPath = "conversation" | "whiteboard";
export interface Conversation {
  id: string;
  path: TutorPath | null /* ... */;
}


/types/practice.ts

```ts
export type Mastery = "low" | "medium" | "high";
export interface PracticeSession {
  id: string;
  userId: string;
  rawProblemText: string;
  attempts: number;
  hintsUsed: number;
  timeOnTaskMs: number;
  score: number;
  mastery: Mastery /* ... */;
}
````

Deliver each phase in order; output only changed/added files with full code.
