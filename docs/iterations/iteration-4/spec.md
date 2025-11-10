# Handwriting Tracing Guide System Implementation

## Overview

When the AI says "Correct! Can you write {answer} on the board?", a guide number appears with reduced opacity for tracing. On submit, the system evaluates tracing accuracy (70% threshold) and provides feedback. Poor attempts (<70%) automatically clear after a delay.

## Implementation Steps

### 1. Create Number Guide Generator

**File:** `src/lib/whiteboard/number-guides.ts`

- Create `generateNumberGuide()` function that creates Excalidraw freedraw elements for digits 0-9
- Define path coordinates for each number as normalized points (0-100 range)
- Scale and translate points to fit specified bounds
- Set guide elements with: opacity 40%, locked=true, strokeColor="#888888", roughness=0
- Create `isGuideElement()` helper to identify guide elements
- Create `filterGuideElements()` to separate user drawings from guides

### 2. Create Tracing Accuracy Calculator

**File:** `src/lib/whiteboard/tracing-accuracy.ts`

- Create `calculateTracingAccuracy()` function
- Extract points from student's freedraw elements
- Extract points from guide elements
- Calculate average distance from student points to nearest guide points
- Use 10% of guide size as max acceptable distance
- Return score 0-100: 70% distance accuracy + 30% coverage (points within tolerance)
- Handle edge cases: no drawings, no guide, empty scenes

### 3. Add Guide Detection in AI Response Handler

**File:** `src/app/(app)/app/whiteboard/_components/WhiteboardChatSidebar.tsx` or `EphemeralChatPane.tsx`

- Parse AI assistant messages for pattern: "Correct! Can you write {number} on the board?"
- Extract the number from the message
- Store extracted number in state (e.g., `guideNumber` state)
- Pass `guideNumber` to WhiteboardPanel component

### 4. Update Whiteboard Component for Guide Support

**File:** `src/app/(app)/app/whiteboard/_components/Whiteboard.tsx`

- Add props: `guideNumber?: string | null`, `onTracingAccuracy?: (accuracy: number) => void`
- Generate guide elements when `guideNumber` changes using `generateNumberGuide()`
- Merge guide elements with scene elements (guides first, then user elements)
- Filter out guide elements before saving (only save user drawings)
- Calculate tracing accuracy on change when guide is active
- Call `onTracingAccuracy` callback with accuracy score
- Use `initialData` that includes guide elements when guide is active

### 5. Update WhiteboardPanel to Handle Guide State

**File:** `src/app/(app)/app/whiteboard/_components/WhiteboardPanel.tsx`

- Accept `guideNumber` prop from parent
- Pass `guideNumber` to Whiteboard component
- Track `tracingAccuracy` state
- Handle accuracy callback from Whiteboard
- Show accuracy feedback in UI (optional, for debugging)

### 6. Update Board Router for Tracing Accuracy Check

**File:** `src/server/api/routers/board.ts`

- Update `checkWhiteboardAnswer` mutation to:
- Accept optional `guideNumber` parameter
- If `guideNumber` provided, generate guide elements
- Calculate tracing accuracy using `calculateTracingAccuracy()`
- Return `tracingAccuracy` in response (0-100)
- Keep existing answer correctness check for math validation
- Return both `isCorrect` (math) and `tracingAccuracy` (handwriting)

### 7. Update Whiteboard Submit Handler

**File:** `src/app/(app)/app/whiteboard/_components/WhiteboardPanel.tsx`

- In `handleSubmit`, check if `guideNumber` exists
- If guide active, pass `guideNumber` to `checkWhiteboardAnswer` mutation
- On success, check `tracingAccuracy`:
- If >= 70%: Show success, call `onSubmit(true, extractedAnswer)`
- If < 70%: Show "Try again" message, auto-clear whiteboard after 2-3 second delay
- Auto-clear implementation: Call board.save with empty elements array, or use Excalidraw API to clear

### 8. Update WhiteboardClient for Guide Flow

**File:** `src/app/(app)/app/whiteboard/_components/WhiteboardClient.tsx`

- Add state: `guideNumber: string | null`
- In EphemeralChatPane or chat handler, detect AI message pattern
- Extract number from "Can you write {number} on the board?" message
- Set `guideNumber` state
- Pass `guideNumber` to WhiteboardPanel
- Clear `guideNumber` when: new problem starts, guide removed (future), or after successful submission

### 9. Prepare Data Structure for Future Learning Tracking

**File:** `src/server/db/schema.ts` or new file

- Add comment/TODO for future `handwriting_progress` table:
- Fields: `userId`, `number` (digit 0-9), `accuracy_history` (JSON array), `average_accuracy`, `attempts_count`, `guide_removed` (boolean), `last_practiced`
- Add comment in board router about future integration point
- No implementation needed, just documentation/structure

### 10. Update AI Prompt for Tracing Context

**File:** `src/lib/ai/prompts.ts`

- Update system prompt to mention:
- When saying "Can you write {answer} on the board?", a guide will appear
- For poor tracing (<70%): "Can you try again? I'll clear the board for you."
- For good tracing (>=70%): "Very good! Your handwriting is improving."
- Keep existing exact phrases but add context about tracing feedback

### 11. Auto-Clear Implementation

**File:** `src/app/(app)/app/whiteboard/_components/WhiteboardPanel.tsx`

- When accuracy < 70%, show message: "Try again! Clearing the board..."
- After 2-3 second delay, clear whiteboard:
- Option A: Call `board.save` mutation with empty elements
- Option B: Use Excalidraw API `updateScene({ elements: [] })` if available
- Reset `tracingAccuracy` state

### 12. Testing Considerations

- Test guide appearance when AI message detected
- Test accuracy calculation with various drawings
- Test auto-clear on poor accuracy
- Test that guides don't save to database
- Test guide filtering from scene saves
- Test edge cases: no guide, no drawing, multiple drawings

## Files to Create

- `src/lib/whiteboard/number-guides.ts` - Guide generation
- `src/lib/whiteboard/tracing-accuracy.ts` - Accuracy calculation

## Files to Modify

- `src/app/(app)/app/whiteboard/_components/Whiteboard.tsx` - Guide support
- `src/app/(app)/app/whiteboard/_components/WhiteboardPanel.tsx` - Guide state & auto-clear
- `src/app/(app)/app/whiteboard/_components/WhiteboardClient.tsx` - Guide detection from AI
- `src/app/(app)/app/whiteboard/_components/WhiteboardChatSidebar.tsx` or `EphemeralChatPane.tsx` - Message parsing
- `src/server/api/routers/board.ts` - Tracing accuracy endpoint
- `src/lib/ai/prompts.ts` - Update prompt context

## Future Considerations (Out of Scope)

- Learning tracking: Store accuracy history per number
- Progressive guide removal: Remove guide after N successful attempts
- Adaptive difficulty: Adjust guide opacity based on performance
- Number-specific progress: Track improvement per digit separately
