import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { env } from "@/lib/env";
import { files } from "@/server/db/schema";

export const filesRouter = createTRPCRouter({
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().regex(/^image\/(png|jpeg)$/),
      }),
    )
    .mutation(async ({ input }) => {
      // Generate a unique pathname for the upload
      const pathname = `uploads/${crypto.randomUUID()}-${input.filename}`;

      // Return pathname, content type, and token for client-side upload
      // Client will use put() from @vercel/blob with the token
      // Note: For production, consider using a more secure approach (e.g., server-side upload)
      return {
        pathname,
        contentType: input.contentType,
        token: env.BLOB_READ_WRITE_TOKEN,
      };
    }),

  finalize: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        blobUrl: z.string().url(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [file] = await ctx.db
        .insert(files)
        .values({
          conversationId: input.conversationId,
          blobUrl: input.blobUrl,
          kind: "upload",
        })
        .returning({ id: files.id });

      if (!file) {
        throw new Error("Failed to create file record");
      }

      return { fileId: file.id };
    }),
});
