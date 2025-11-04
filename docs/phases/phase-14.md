### Phase 14 — Voice (OpenAI)

**Goal:** Optional STT/TTS.
**Tasks:**

* Client recorder (MediaRecorder) → server → OpenAI Whisper → text to `ai.tutorTurn`.
* TTS: synthesize assistant turn audio via OpenAI TTS; play toggle on message.
  **Acceptance Criteria:**
* Speaking a question posts recognized text reliably.
* Assistant audio plays for streamed responses (post-completion is fine for MVP).

