### Phase 11 — Whiteboard (Excalidraw, Single-User + AI)

**Goal:** Embedded board with autosave and AI annotations.
**Tasks:**

* Add `Whiteboard` component using `@excalidraw/excalidraw`.
* Load latest scene by `conversationId`; throttle `onChange` → `board.save`.
* Minimal AI draw helpers: box, arrow, label; allow LaTeX→SVG insert (as image element with raw TeX in `customData`).
  **Implementation Notes**

```tsx
// /components/Whiteboard.tsx
import { Excalidraw } from "@excalidraw/excalidraw";
export function Whiteboard({ initialData, onChange, excalidrawRef }) {
  return (
    <div className="h-[70vh] border rounded-xl">
      <Excalidraw ref={excalidrawRef} initialData={initialData}
        onChange={(els, appState) => onChange?.({ els, appState })} />
    </div>
  );
}
```

**Acceptance Criteria:**

* Board state reloads across refresh and persists per conversation.
* “Add annotation” from AI visibly draws an element at the right moment.
* Snapshot endpoint creates a versioned row; “Revert to snapshot” restores state.

