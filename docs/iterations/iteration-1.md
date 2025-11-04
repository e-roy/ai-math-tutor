# Align Codebase with Documentation

This plan addresses the gaps between the current implementation and the documented sequence/architecture diagrams.

## Key Changes Required

1. **Migrate to Vercel AI SDK** - Replace direct OpenAI calls with Vercel AI SDK
2. **Add AI Board Annotations** - Enable AI to add elements to whiteboard during tutor turns
3. **Add Verify Equivalence Endpoint** - Create tRPC endpoint for math equivalence verification
4. **Integrate Answer Validation Flow** - Wire up validation with mastery updates

## Implementation Details

### 1. Migrate AI Router to Vercel AI SDK

**File:** `src/server/api/routers/ai.ts`

- Replace direct OpenAI client with `streamText` from `ai` package
- Use `openai` provider from `@ai-sdk/openai` (or use OpenAI directly via AI SDK)
- Maintain streaming via tRPC subscriptions
- Update imports and error handling

**File:** `src/server/api/routers/ocr.ts`

- Replace direct OpenAI Vision calls with AI SDK vision capabilities
- Use `generateObject` or similar for structured OCR output
- Maintain same return signature

### 2. Add AI Board Annotation Capability

**File:** `src/server/api/routers/ai.ts`

- After streaming assistant response, check if AI wants to add board annotations
- Add tool/function calling support for board operations
- Call `board.save` internally when AI requests annotations
- Return annotation metadata in stream

**File:** `src/lib/ai/tools.ts` (may need to create)

- Add board annotation tool definition
- Define schema for box, arrow, label operations

**File:** `src/components/Whiteboard.tsx`

- Listen for AI annotation events via tRPC subscription or ref
- Apply annotations to Excalidraw scene when received

### 3. Add Verify Equivalence Endpoint

**File:** `src/server/api/routers/ai.ts` (or create `src/server/api/routers/validation.ts`)

- Add `verifyEquivalence` procedure
- Input: `{ studentAnswer: string, expectedAnswer: string }`
- Output: `{ isEquivalent: boolean, confidence: string, reason?: string }`
- Use existing `validateAnswer` from `src/lib/math/llm-validate.ts`
- Move validation logic to server-side

### 4. Integrate Answer Validation with Mastery Updates

**File:** `src/components/ChatPane.tsx`

- After student submits math answer, call client-side validation first
- If inconclusive, call `ai.verifyEquivalence` endpoint
- After validation, determine if mastery should be updated
- Call `progress.updateMastery` with appropriate skillId, level, and evidence
- Include turnIds and potentially snapshotIds in evidence

**File:** `src/components/MathAnswerBox.tsx`

- May need to pass expected answer or skillId context
- Integrate validation flow into submit handler

## Dependencies

- `ai` package (already installed v5.0.87) - Vercel AI SDK
- May need `@ai-sdk/openai` for OpenAI provider integration
- Existing `mathjs` and validation utilities are sufficient

## Testing Considerations

- Verify streaming still works with AI SDK
- Test AI board annotations appear correctly
- Ensure validation endpoint returns correct results
- Confirm mastery updates trigger after answer validation

## Notes

- Keep existing tRPC subscription pattern for streaming
- Maintain backward compatibility with existing chat flow
- Board annotations should be optional (opt-in via tool calling)
- Validation should be seamless - user shouldn't notice the endpoint call
