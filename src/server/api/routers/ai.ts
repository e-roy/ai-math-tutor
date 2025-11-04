import { z } from "zod";
import { eq } from "drizzle-orm";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { conversations, files, boards } from "@/server/db/schema";
import { createTurn, getTurnsByConversation } from "@/server/db/turns";
import { SOCRATIC_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  classifyTurnTool,
  boardAnnotationTool,
  classifyTurnSchema,
  boardAnnotationSchema,
} from "@/lib/ai/tools";
import type { TurnClassifierResult } from "@/types/ai";
import { generateTitleFromProblem } from "@/lib/conversations/title-generator";
import {
  drawBox,
  drawArrow,
  drawLabel,
  insertLatexAsImage,
} from "@/lib/whiteboard/ai-draw-helpers";
import {
  dbFormatToScene,
  sceneToDbFormat,
} from "@/lib/whiteboard/scene-adapters";
import type { ExcalidrawScene } from "@/types/board";

/**
 * Extract LaTeX expressions from text
 * Looks for patterns like $...$ or \(...\) or \[...\]
 */
function extractLatex(text: string): string | null {
  // Match $...$ (inline math)
  const inlineRegex = /\$([^$]+)\$/;
  const inlineMatch = inlineRegex.exec(text);
  if (inlineMatch?.[1]?.trim()) {
    return inlineMatch[1].trim();
  }

  // Match \(...\) (inline math)
  const inlineParenRegex = /\\\(([^)]+)\\\)/;
  const inlineParenMatch = inlineParenRegex.exec(text);
  if (inlineParenMatch?.[1]?.trim()) {
    return inlineParenMatch[1].trim();
  }

  // Match \[...\] (display math)
  const displayRegex = /\\\[([^\]]+)\\\]/;
  const displayMatch = displayRegex.exec(text);
  if (displayMatch?.[1]?.trim()) {
    return displayMatch[1].trim();
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
      // Verify user owns the conversation and check title
      const [conversation] = await ctx.db
        .select({ userId: conversations.userId, title: conversations.title })
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

      // Load conversation context (previous turns) to check if this is first turn
      const previousTurns = await getTurnsByConversation(
        ctx.db,
        input.conversationId,
      );

      // Persist user turn if provided
      if (input.userText || input.userLatex) {
        await createTurn(ctx.db, {
          conversationId: input.conversationId,
          role: "user",
          text: input.userText ?? null,
          latex: input.userLatex ?? null,
        });

        // Auto-generate title from first user message if conversation doesn't have one
        if (!conversation.title && previousTurns.length === 0) {
          const titleText =
            input.userText ??
            (input.userLatex ? `Solve: ${input.userLatex}` : "");
          if (titleText) {
            const generatedTitle = generateTitleFromProblem(titleText);
            try {
              await ctx.db
                .update(conversations)
                .set({ title: generatedTitle })
                .where(eq(conversations.id, input.conversationId));
            } catch (error) {
              // Non-fatal: title generation failed, but turn succeeded
              console.error("Failed to update conversation title:", error);
            }
          }
        }
      }

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

        const ocrText = file?.ocrText;
        if (ocrText && typeof ocrText === "string") {
          // Add file context to the last user message or create a new one
          const lastMessage = messages[messages.length - 1];
          if (lastMessage?.role === "user") {
            lastMessage.content = `Problem from image: ${ocrText}\n\n${lastMessage.content}`;
          } else {
            messages.push({
              role: "user",
              content: `Problem from image: ${ocrText}`,
            });
          }
        }
      }

      // Stream the response using Vercel AI SDK
      const result = streamText({
        model: openai("gpt-4o-mini"),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        tools: {
          classifyTurn: classifyTurnTool,
          addBoardAnnotation: boardAnnotationTool,
        },
      });

      // Process streaming response
      let fullText = "";
      let turnType: TurnClassifierResult["type"] | null = null;
      let toolMetadata: unknown = null;

      // Stream text chunks
      for await (const chunk of result.textStream) {
        fullText += chunk;
        yield { type: "text", content: chunk };
      }

      // Process tool calls after streaming completes
      const toolCalls = await result.toolCalls;
      let boardAnnotations: unknown[] | null = null;

      for (const toolCall of toolCalls) {
        if (
          toolCall.toolName === "classifyTurn" &&
          toolCall.type === "tool-call" &&
          "input" in toolCall
        ) {
          try {
            // toolCall.input is already parsed by the AI SDK
            const parsed = classifyTurnSchema.parse(toolCall.input);
            turnType = parsed.type;
            toolMetadata = { type: parsed.type };
          } catch {
            // Ignore parse errors
          }
        } else if (
          toolCall.toolName === "addBoardAnnotation" &&
          toolCall.type === "tool-call" &&
          "input" in toolCall
        ) {
          try {
            const parsed = boardAnnotationSchema.parse(toolCall.input);
            // Get current board state
            const [board] = await ctx.db
              .select()
              .from(boards)
              .where(eq(boards.conversationId, input.conversationId))
              .limit(1);

            let currentScene: ExcalidrawScene;
            let currentVersion: number;

            if (board) {
              currentScene = dbFormatToScene(board.scene);
              currentVersion = (board.version as number | null) ?? 1;
            } else {
              currentScene = {
                elements: [],
                appState: {},
                files: {},
              };
              currentVersion = 1;
            }

            // Create new elements from annotations
            const newElements: unknown[] = [];
            for (const element of parsed.elements) {
              if (element.type === "box") {
                newElements.push(
                  drawBox(
                    element.x,
                    element.y,
                    element.width,
                    element.height,
                    element.label,
                  ),
                );
              } else if (element.type === "arrow") {
                newElements.push(
                  drawArrow(
                    element.x1,
                    element.y1,
                    element.x2,
                    element.y2,
                    element.label,
                  ),
                );
              } else if (element.type === "label") {
                newElements.push(
                  drawLabel(
                    element.x,
                    element.y,
                    element.text,
                    element.fontSize,
                  ),
                );
              } else if (element.type === "latex") {
                newElements.push(
                  insertLatexAsImage(
                    element.x,
                    element.y,
                    element.latex,
                    element.width,
                    element.height,
                  ),
                );
              }
            }

            // Merge new elements into existing scene
            const updatedScene: ExcalidrawScene = {
              ...currentScene,
              elements: [...(currentScene.elements ?? []), ...newElements],
            };

            // Save updated board
            const sceneData = sceneToDbFormat(updatedScene);
            if (board) {
              // Update existing board
              await ctx.db
                .update(boards)
                .set({
                  scene: sceneData,
                  version: currentVersion + 1,
                })
                .where(eq(boards.id, board.id as string));
            } else {
              // Create new board
              await ctx.db.insert(boards).values({
                conversationId: input.conversationId,
                scene: sceneData,
                version: 1,
              });
            }

            boardAnnotations = newElements;
          } catch (error) {
            // Log error but don't fail the turn
            console.error("Failed to add board annotations:", error);
          }
        }
      }

      // Yield board annotation event if any were added
      if (boardAnnotations && boardAnnotations.length > 0) {
        yield {
          type: "boardAnnotation",
          elements: boardAnnotations,
        };
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

  verifyEquivalence: protectedProcedure
    .input(
      z.object({
        studentAnswer: z.string().min(1),
        expectedAnswer: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      // Import validation logic
      const { validateAnswer } = await import("@/lib/math/llm-validate");
      const result = await validateAnswer(
        input.studentAnswer,
        input.expectedAnswer,
      );
      return {
        isEquivalent: result.isEquivalent,
        confidence: result.confidence,
        reason: result.reason,
      };
    }),
});
