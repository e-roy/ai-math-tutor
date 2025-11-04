import { z } from "zod";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { env } from "@/lib/env";
import { conversations, files } from "@/server/db/schema";
import { createTurn, getTurnsByConversation } from "@/server/db/turns";
import { SOCRATIC_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { classifyTurnTool } from "@/lib/ai/tools";
import { classifyTurnSchema } from "@/lib/ai/tools";
import type { TurnClassifierResult } from "@/types/ai";

const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Extract LaTeX expressions from text
 * Looks for patterns like $...$ or \(...\) or \[...\]
 */
function extractLatex(text: string): string | null {
  // Match $...$ (inline math)
  const inlineMatch = text.match(/\$([^$]+)\$/);
  if (inlineMatch) {
    return inlineMatch[1]?.trim() ?? null;
  }

  // Match \(...\) (inline math)
  const inlineParenMatch = text.match(/\\\(([^)]+)\\\)/);
  if (inlineParenMatch) {
    return inlineParenMatch[1]?.trim() ?? null;
  }

  // Match \[...\] (display math)
  const displayMatch = text.match(/\\\[([^\]]+)\\\]/);
  if (displayMatch) {
    return displayMatch[1]?.trim() ?? null;
  }

  return null;
}

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
    .subscription(async function* ({ input, ctx }) {
      // Verify user owns the conversation
      const [conversation] = await ctx.db
        .select({ userId: conversations.userId })
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
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
          message: "You do not have access to this conversation",
        });
      }

      // Persist user turn if provided
      let userTurnId: string | null = null;
      if (input.userText || input.userLatex) {
        const userTurn = await createTurn(ctx.db, {
          conversationId: input.conversationId,
          role: "user",
          text: input.userText ?? null,
          latex: input.userLatex ?? null,
        });
        userTurnId = userTurn.id;
      }

      // Load conversation context (previous turns)
      const previousTurns = await getTurnsByConversation(
        ctx.db,
        input.conversationId,
      );

      // Build conversation history from turns
      const messages: Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }> = [
        {
          role: "system",
          content: SOCRATIC_SYSTEM_PROMPT,
        },
      ];

      // Add previous turns to history
      for (const turn of previousTurns) {
        if (turn.text) {
          messages.push({
            role: turn.role,
            content: turn.text,
          });
        }
      }

      // Add current user turn if provided
      if (input.userText) {
        messages.push({
          role: "user",
          content: input.userText,
        });
      } else if (input.userLatex) {
        messages.push({
          role: "user",
          content: `Solve: ${input.userLatex}`,
        });
      }

      // Add file context if fileId is provided
      if (input.fileId) {
        const [file] = await ctx.db
          .select({ ocrText: files.ocrText })
          .from(files)
          .where(eq(files.id, input.fileId))
          .limit(1);

        if (file?.ocrText) {
          // Add file context to the last user message or create a new one
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === "user") {
            lastMessage.content = `Problem from image: ${file.ocrText}\n\n${lastMessage.content}`;
          } else {
            messages.push({
              role: "user",
              content: `Problem from image: ${file.ocrText}`,
            });
          }
        }
      }

      // Stream the response using Vercel AI SDK
      // Note: For tRPC streaming, we'll use subscription pattern
      // Using OpenAI directly for now - will need @ai-sdk/openai for proper integration
      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools: [
          {
            type: "function",
            function: {
              name: "classifyTurn",
              description:
                "Classify the type of your tutoring response to help the UI display appropriate badges and styling. Use this after every assistant response.",
              parameters: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["ask", "hint", "validate", "refocus"],
                    description:
                      "The type of turn: 'ask' for guiding questions, 'hint' for concrete hints after 2+ stuck turns, 'validate' for checking work/answers, 'refocus' for redirecting to the problem or key concepts",
                  },
                },
                required: ["type"],
              },
            },
          },
        ],
        tool_choice: "auto",
        stream: true,
        max_tokens: 500,
      });

      // Process streaming response
      let fullText = "";
      let turnType: TurnClassifierResult["type"] | null = null;
      let toolMetadata: unknown = null;

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Handle text content
        if (delta.content) {
          fullText += delta.content;
          yield { type: "text", content: delta.content };
        }

        // Handle tool calls (turn classifier)
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name === "classifyTurn") {
              try {
                const args = JSON.parse(
                  toolCall.function.arguments ?? "{}",
                ) as { type?: string };
                if (args.type) {
                  const parsed = classifyTurnSchema.parse({ type: args.type });
                  turnType = parsed.type;
                  toolMetadata = { type: parsed.type };
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Extract LaTeX from response if present
      const latex = extractLatex(fullText);

      // Persist assistant turn
      const assistantTurn = await createTurn(ctx.db, {
        conversationId: input.conversationId,
        role: "assistant",
        text: fullText,
        latex: latex,
        tool: toolMetadata,
      });

      // Send final message with turn ID and metadata
      yield {
        type: "done",
        turnId: assistantTurn.id,
        fullText: fullText,
        latex: latex,
        turnType: turnType,
      };
    }),
});
