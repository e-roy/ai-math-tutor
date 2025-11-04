import { z } from "zod";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { env } from "@/lib/env";
import { files, conversations } from "@/server/db/schema";
import { generateTitleFromProblem } from "@/lib/conversations/title-generator";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export const ocrRouter = createTRPCRouter({
  parseImage: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Query file record by fileId
      const [file] = await ctx.db
        .select({
          conversationId: files.conversationId,
          blobUrl: files.blobUrl,
        })
        .from(files)
        .where(eq(files.id, input.fileId))
        .limit(1);

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      // Verify user owns the conversation and check if title needs updating
      const conversationId = file.conversationId;
      const [conversation] = await ctx.db
        .select({
          userId: conversations.userId,
          title: conversations.title,
        })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this file",
        });
      }

      // Validate that the image URL is accessible
      const blobUrl: string = file.blobUrl;
      try {
        const imageResponse = await fetch(blobUrl, { method: "HEAD" });
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to load image. Please try uploading again.",
          cause: error,
        });
      }

      // Call OpenAI Vision API
      let visionResponse;
      try {
        visionResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a math OCR tool. Extract ONLY the math problem text from the image. Do not add explanations, prefixes, or commentary. Return the text exactly as it appears. If there are mathematical expressions, provide the LaTeX representation on a new line prefixed with 'LaTeX: '.",
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: blobUrl,
                  },
                },
                {
                  type: "text",
                  text: "Extract the math problem text from this image. Return ONLY the problem text, nothing else. If you see mathematical expressions, provide the LaTeX format on a new line starting with 'LaTeX: '.",
                },
              ],
            },
          ],
          max_tokens: 500,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Failed to process image. Please ensure the image is clear and contains a math problem.",
          cause: error,
        });
      }

      // Parse response to extract text and optional LaTeX
      const content = visionResponse.choices[0]?.message?.content;
      if (!content) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "No text could be extracted from the image. Please try a clearer image.",
        });
      }

      // Extract text and LaTeX from response
      // The model may return text with optional "LaTeX: ..." on a new line
      const lines = content.trim().split("\n");
      let extractedText = "";
      let extractedLatex: string | undefined;

      // Find LaTeX line (starts with "LaTeX: ")
      const latexLineIndex = lines.findIndex((line) =>
        /^LaTeX:\s*/i.test(line),
      );
      if (latexLineIndex >= 0) {
        extractedLatex = lines[latexLineIndex]
          ?.replace(/^LaTeX:\s*/i, "")
          .trim();
        // Remove LaTeX line from text
        extractedText = lines
          .slice(0, latexLineIndex)
          .concat(lines.slice(latexLineIndex + 1))
          .join("\n")
          .trim();
      } else {
        // No LaTeX line found, use entire content as text
        extractedText = content.trim();
      }

      // Clean up any remaining explanatory text
      // Remove common prefixes like "The math problem is:" etc.
      extractedText = extractedText
        .replace(
          /^(The|This)?\s*(math\s*)?problem\s*(text|is|from|extracted)?\s*:?\s*/i,
          "",
        )
        .replace(
          /^(Here|This)\s*(is|shows)\s*(the\s*)?(math\s*)?(problem\s*)?:?\s*/i,
          "",
        )
        .trim();

      // If text is empty after cleaning, use original
      if (!extractedText) {
        extractedText = content.trim();
      }

      // Update file record with ocrText
      try {
        await ctx.db
          .update(files)
          .set({ ocrText: extractedText })
          .where(eq(files.id, input.fileId));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save extracted text. Please try again.",
          cause: error,
        });
      }

      // Auto-generate title from OCR text if conversation doesn't have one
      if (!conversation.title && extractedText) {
        const generatedTitle = generateTitleFromProblem(extractedText);
        try {
          await ctx.db
            .update(conversations)
            .set({ title: generatedTitle })
            .where(eq(conversations.id, conversationId));
        } catch (error) {
          // Non-fatal: title generation failed, but OCR succeeded
          console.error("Failed to update conversation title:", error);
        }
      }

      return {
        text: extractedText,
        latex: extractedLatex,
      };
    }),
});
