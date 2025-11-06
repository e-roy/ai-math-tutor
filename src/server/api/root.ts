import {
  createCallerFactory,
  createTRPCRouter,
  publicProcedure,
} from "@/server/api/trpc";
import { aiRouter } from "@/server/api/routers/ai";
import { boardRouter } from "@/server/api/routers/board";
import { childrenRouter } from "@/server/api/routers/children";
import { conversationsRouter } from "@/server/api/routers/conversations";
import { filesRouter } from "@/server/api/routers/files";
import { ocrRouter } from "@/server/api/routers/ocr";
import { practiceRouter } from "@/server/api/routers/practice";
import { progressRouter } from "@/server/api/routers/progress";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ status: "ok" })),
  ai: aiRouter,
  ocr: ocrRouter,
  board: boardRouter,
  progress: progressRouter,
  practice: practiceRouter,
  files: filesRouter,
  conversations: conversationsRouter,
  children: childrenRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
