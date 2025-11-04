### Phase 5 — tRPC Router Scaffolding ✅

**Goal:** Type-safe API surface with auth guards.
**Tasks:**

- Create routers: `ai`, `ocr`, `board`, `progress`, `files`.
- Add Zod input/output types; enforce auth on mutations.
  **Router Signatures (minimal)**

```ts
// ai.ts
export const aiRouter = createTRPCRouter({
  tutorTurn: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        userText: z.string().min(1).optional(),
        userLatex: z.string().optional(),
        fileId: z.string().uuid().optional(),
      }),
    )
    .mutation(/* stream via Vercel AI SDK */),
});

// ocr.ts
export const ocrRouter = createTRPCRouter({
  parseImage: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .mutation(/* OpenAI Vision */),
});

// board.ts
export const boardRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(/* ... */),
  save: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        scene: z.any(),
        version: z.number().int().min(1),
      }),
    )
    .mutation(/* ... */),
  snapshot: protectedProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        version: z.number().int().min(1),
        scene: z.any(),
      }),
    )
    .mutation(/* ... */),
});

// progress.ts
export const progressRouter = createTRPCRouter({
  updateMastery: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        skillId: z.string().uuid(),
        level: z.number().int().min(0).max(4),
        evidence: z.any().optional(),
      }),
    )
    .mutation(/* ... */),
  getOverview: protectedProcedure.query(/* ... */),
});

// files.ts
export const filesRouter = createTRPCRouter({
  getUploadUrl: protectedProcedure.mutation(/* Vercel Blob signed upload */),
  finalize: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        blobUrl: z.string().url(),
      }),
    )
    .mutation(/* create files row */),
});
```

**Acceptance Criteria:**

- Routers compile; mock logic returns shape-correct data.
- Auth-protected routes reject unauthenticated requests.
