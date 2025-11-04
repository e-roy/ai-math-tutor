### Phase 8 — OCR via Vision LLM

**Goal:** Extract math problem text (printed-first).
**Tasks:**

* `ocr.parseImage(fileId)` fetches blob → OpenAI Vision → returns parsed text + optional LaTeX.
* Save `ocr_text` back to `files`.
  **Acceptance Criteria:**
* For clear printed examples, result contains legible text suitable for tutoring.
* Errors surfaced as user-friendly messages.
