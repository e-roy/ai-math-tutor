import { z } from "zod";
import { eq } from "drizzle-orm";
import { streamText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { conversations, files, boards } from "@/server/db/schema";
import { createTurn, getTurnsByConversation } from "@/server/db/turns";
import {
  SOCRATIC_SYSTEM_PROMPT,
  SOCRATIC_CONVERSATION_PROMPT,
} from "@/lib/ai/prompts";
import {
  detectProblemType,
  getProblemTypeGuidance,
} from "@/lib/ai/problem-detector";
import type { SocraticPhase } from "@/types/conversation";
import {
  classifyTurnTool,
  boardAnnotationTool,
  checkAnswerTool,
  evaluateTool,
  classifyTurnSchema,
  boardAnnotationSchema,
  checkAnswerSchema,
} from "@/lib/ai/tools";
import { calculatorTools } from "@/lib/ai/math-tools";
import type { TurnClassifierResult } from "@/types/ai";
import { generateTitleFromProblem } from "@/lib/conversations/title-generator";
import { detectTopic, inferGrade } from "@/lib/conversations/topic-detector";
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

/**
 * Determine the current Socratic phase based on conversation history
 */
function determineCurrentPhase(
  turns: Array<{ role: string; text: string | null }>,
): SocraticPhase {
  if (turns.length === 0) return "parse-problem";
  if (turns.length <= 2) return "inventory-knowns";

  const recentText = turns
    .slice(-3)
    .map((t) => t.text?.toLowerCase() || "")
    .join(" ");

  if (/what are we trying to find|what.*looking for|goal/.test(recentText)) {
    return "identify-goal";
  }
  if (/method|strategy|approach|formula|operation/.test(recentText)) {
    return "select-method";
  }
  if (/step|next|then|after/.test(recentText)) {
    return "step-through";
  }
  if (/check|correct|verify|right/.test(recentText)) {
    return "validate-answer";
  }

  return "step-through"; // Default to working through
}

export const aiRouter = createTRPCRouter({
  tutorTurn: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        userText: z.string().min(1).optional(),
        userLatex: z.string().optional(),
        fileId: z.string().uuid().optional(),
        ephemeral: z.boolean().optional(),
        problemText: z.string().optional(),
        isHintRequest: z.boolean().optional(),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              text: z.string().optional().nullable(),
              latex: z.string().optional().nullable(),
            }),
          )
          .optional(),
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

      const isEphemeral = input.ephemeral === true;

      // Load conversation context (previous turns) to check if this is first turn
      // For ephemeral mode, we still load turns for context but won't persist new ones
      const previousTurns = await getTurnsByConversation(
        ctx.db,
        input.conversationId,
      );

      // Persist user turn if provided (skip if ephemeral or if problemText is provided directly)
      // When problemText is provided directly, we don't want to persist the initial user message
      if (
        (input.userText || input.userLatex) &&
        !isEphemeral &&
        !input.problemText
      ) {
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

      // Generate title from problemText if provided directly and conversation has no title
      if (
        input.problemText &&
        !conversation.title &&
        previousTurns.length === 0
      ) {
        try {
          const generatedTitle = generateTitleFromProblem(input.problemText);
          await ctx.db
            .update(conversations)
            .set({ title: generatedTitle })
            .where(eq(conversations.id, input.conversationId));
        } catch (error) {
          // Non-fatal: title generation failed
          console.error(
            "Failed to update conversation title from problemText:",
            error,
          );
        }
      }

      // Auto-tag conversation with topic and grade if not already set
      if (input.problemText && previousTurns.length === 0) {
        const currentMeta = conversation.meta as Record<string, unknown> | null;
        if (!currentMeta?.topic || !currentMeta?.grade) {
          try {
            const problemType = detectProblemType(input.problemText);
            const topic = detectTopic(input.problemText, problemType);
            const grade = inferGrade(input.problemText);

            const updatedMeta = {
              ...(currentMeta || {}),
              topic: currentMeta?.topic || topic,
              grade: currentMeta?.grade || grade,
              path: currentMeta?.path || "conversation",
            };

            await ctx.db
              .update(conversations)
              .set({ meta: updatedMeta })
              .where(eq(conversations.id, input.conversationId));
          } catch (error) {
            // Non-fatal: tagging failed
            console.error("Failed to auto-tag conversation:", error);
          }
        }
      }

      // Extract problem text from conversation
      // problemText is provided directly as a parameter
      const problemText: string | null = input.problemText ?? null;

      // Build conversation history from turns
      // Detect problem type and get specific guidance
      let systemPrompt = SOCRATIC_CONVERSATION_PROMPT; // Use conversation path prompt
      
      // Handle hint request
      if (input.isHintRequest) {
        systemPrompt += `\n\n## Hint Request\nThe student has explicitly requested a hint. Provide a concrete, helpful hint that guides them toward the solution WITHOUT giving the answer directly. Use encouraging language and focus on the next step they should take or concept they should consider.`;
      }

      if (problemText) {
        const problemType = detectProblemType(problemText);
        const typeGuidance = getProblemTypeGuidance(problemType);

        // Add problem type context to system prompt
        systemPrompt += `\n\n## Current Problem Context\nProblem Type: ${problemType}\nGuidance: ${typeGuidance}\nProblem Text: ${problemText}\n\nAdapt your questions to this specific problem type.`;

        // Add problem text context to system prompt
        // The AI should ask "What is {equation}?" as the first question
        // and use checkAnswer tool to verify student answers
        const isFirstMessage =
          (isEphemeral && input.conversationHistory?.length === 0) ||
          (!isEphemeral && previousTurns.length === 0);

        if (isFirstMessage) {
          systemPrompt += `\n\n[Internal context: The student is starting a new problem. The problem/equation is: "${problemText}". Your FIRST message must be: "What is ${problemText}?"]`;
        } else {
          systemPrompt += `\n\n[Internal context: The student is working on this problem: "${problemText}". When the student provides an answer (from chat or whiteboard), you MUST use the checkAnswer tool with studentAnswer=(their answer) and problemText="${problemText}" to verify correctness. The checkAnswer tool will return isCorrect (true/false) and solvedAnswer (the correct answer). 

For chat answers: Use "That isn't correct, can you try again?" for wrong answers, or "Correct! Can you write {solvedAnswer} on the board?" for correct answers.

For whiteboard submissions (after asking them to write on board): Use "Can you try again?" for wrong answers, or "Very good!" for correct answers.]`;
        }
      }

      const messages: Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }> = [
        {
          role: "system",
          content: systemPrompt,
        },
      ];

      // For ephemeral mode, use provided conversation history if available
      // Otherwise, fall back to database turns
      if (isEphemeral && input.conversationHistory) {
        // Use client-provided history for ephemeral conversations
        for (const turn of input.conversationHistory) {
          const content = turn.latex
            ? `Solve: ${turn.latex}`
            : (turn.text ?? "");
          if (content) {
            messages.push({
              role: turn.role,
              content,
            });
          }
        }
      } else {
        // Use database turns for non-ephemeral or when history not provided
        for (const turn of previousTurns) {
          if (turn.text) {
            messages.push({
              role: turn.role,
              content: turn.text,
            });
          }
        }
      }

      // Add current user turn if provided
      // Skip adding user message if problemText is provided directly (first message scenario)
      // In this case, we want the conversation to start with the Assistant's first message
      if (!input.problemText) {
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
      const mathTools = calculatorTools();
      const result = streamText({
        model: openai("gpt-4o-mini"),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        tools: {
          classifyTurn: classifyTurnTool,
          addBoardAnnotation: boardAnnotationTool,
          checkAnswer: checkAnswerTool,
          evaluate: evaluateTool,
          ...mathTools,
        },
        stopWhen: stepCountIs(5),
        // maxSteps: 5, // Allow multiple steps: tool execution + text generation
      });

      // Process streaming response
      let fullText = "";
      let turnType: TurnClassifierResult["type"] | null = null;
      let toolMetadata: unknown = null;
      let boardAnnotations: unknown[] | null = null as unknown[] | null;

      // Use fullStream to get both text and tool calls as they happen
      // This ensures we get text that comes after tool execution
      try {
        for await (const chunk of result.fullStream) {
          if (chunk.type === "text-delta") {
            fullText += chunk.text;
            yield { type: "text", content: chunk.text };
          } else if (chunk.type === "tool-call" && "input" in chunk) {
            // Tool calls are handled automatically by the SDK
            // We just track them for metadata
            if (chunk.toolName === "classifyTurn") {
              try {
                const parsed = classifyTurnSchema.parse(chunk.input);
                turnType = parsed.type;
                toolMetadata = { type: parsed.type };
              } catch {
                // Ignore parse errors
              }
            } else if (chunk.toolName === "checkAnswer") {
              try {
                const parsed = checkAnswerSchema.parse(chunk.input);
                const currentMetadata = toolMetadata as Record<
                  string,
                  unknown
                > | null;
                toolMetadata = {
                  ...(currentMetadata ?? {}),
                  answerCheck: {
                    studentAnswer: parsed.studentAnswer,
                    problemText: parsed.problemText,
                  },
                };
              } catch (error) {
                console.error("Failed to parse checkAnswer tool call:", error);
              }
            } else if (chunk.toolName === "addBoardAnnotation") {
              try {
                const parsed = boardAnnotationSchema.parse(chunk.input);
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
                  currentVersion = board.version ?? 1;
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
                    .where(eq(boards.id, board.id));
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
                console.error("Failed to add board annotations:", error);
              }
            }
          } else if (chunk.type === "tool-result") {
            // Tool execution completed - AI will continue generating text
          } else if (chunk.type === "error") {
            console.error("[AI Router] Stream error:", chunk);
          } else if (chunk.type === "finish") {
            // When finishReason is 'tool-calls', the SDK should continue automatically
            // Don't break - let the stream continue if there are more chunks
            // Only break if it's a final finish (stop, length, etc.)
            if (
              "finishReason" in chunk &&
              chunk.finishReason !== "tool-calls" &&
              chunk.finishReason !== "other"
            ) {
              break;
            }
          }
        }
      } catch (error) {
        console.error("[AI Router] Error processing stream:", error);
        // If we have any text so far, still yield it
        if (fullText.trim()) {
          yield { type: "text", content: fullText };
        }
        throw error;
      }

      // Yield board annotation event if any were added
      if (
        boardAnnotations &&
        Array.isArray(boardAnnotations) &&
        boardAnnotations.length > 0
      ) {
        yield {
          type: "boardAnnotation",
          elements: boardAnnotations,
        };
      }

      // Extract LaTeX from response if present
      const latex = extractLatex(fullText);

      // Persist assistant turn (skip if ephemeral)
      let turnId: string | null = null;
      if (!isEphemeral) {
        const assistantTurn = await createTurn(ctx.db, {
          conversationId: input.conversationId,
          role: "assistant",
          text: fullText,
          latex: latex,
          tool: toolMetadata,
        });
        turnId = assistantTurn.id;
      }

      // Send final message with turn ID and metadata
      // For ephemeral mode, turnId will be null
      yield {
        type: "done",
        turnId: turnId ?? null,
        fullText: fullText,
        latex: latex,
        turnType: turnType,
      };
    }),

  tutorTurnConversation: protectedProcedure
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

      // Load previous turns from database
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

      // Extract problem text from files (OCR) or first user message
      let problemText: string | null = null;

      // First try: OCR text from file
      if (input.fileId) {
        const [file] = await ctx.db
          .select({ ocrText: files.ocrText })
          .from(files)
          .where(eq(files.id, input.fileId))
          .limit(1);

        if (file?.ocrText && typeof file.ocrText === "string") {
          problemText = file.ocrText;
        }
      }

      // Second try: First user message in conversation
      if (!problemText) {
        const firstUserTurn = previousTurns.find(
          (turn) => turn.role === "user",
        );
        if (firstUserTurn?.text) {
          problemText = firstUserTurn.text;
        } else if (firstUserTurn?.latex) {
          problemText = firstUserTurn.latex;
        }
      }

      // Build conversation history from turns
      let systemPrompt: string = SOCRATIC_CONVERSATION_PROMPT;
      
      // Detect problem type and add guidance
      if (problemText) {
        const problemType = detectProblemType(problemText);
        const typeGuidance = getProblemTypeGuidance(problemType);
        
        if (previousTurns.length === 0) {
          // Add problem context for first message
          systemPrompt = `${systemPrompt}\n\n[Internal context: The student is starting a new ${problemType} problem: "${problemText}". ${typeGuidance}]`;
        } else {
          // Add problem context for ongoing conversation
          systemPrompt = `${systemPrompt}\n\n[Internal context: The student is working on this ${problemType} problem: "${problemText}". ${typeGuidance}]`;
        }
      }

      // Stuck detection: Check for recent incorrect attempts
      const recentTurns = previousTurns.slice(-6); // Last 3 exchanges
      const recentWrongAttempts = recentTurns.filter(
        (turn) =>
          turn.role === "assistant" &&
          turn.text?.toLowerCase().includes("not correct"),
      ).length;

      if (recentWrongAttempts >= 2) {
        systemPrompt = `${systemPrompt}\n\n[IMPORTANT: The student has struggled with ${recentWrongAttempts} incorrect attempts. Provide a concrete, helpful hint (NOT the answer) to guide them toward the solution. Be encouraging.]`;
      }

      // Phase tracking: Determine current phase and add guidance
      const currentPhase = determineCurrentPhase(previousTurns);
      const phaseGuidance = {
        "parse-problem": "Help the student understand what the problem is asking.",
        "inventory-knowns": "Guide them to list what information they have.",
        "identify-goal": "Ask what they need to find or solve for.",
        "select-method": "Help them choose an approach or formula.",
        "step-through": "Guide them through the solution step by step.",
        "validate-answer": "Help them verify their answer makes sense.",
      };

      systemPrompt = `${systemPrompt}\n\n[Current phase: ${currentPhase}. ${phaseGuidance[currentPhase]}]`;

      const messages: Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }> = [
        {
          role: "system",
          content: systemPrompt,
        },
      ];

      // Add previous turns from database
      for (const turn of previousTurns) {
        if (turn.text) {
          messages.push({
            role: turn.role,
            content: turn.text,
          });
        } else if (turn.latex) {
          messages.push({
            role: turn.role,
            content: `Solve: ${turn.latex}`,
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

      // Add file context if fileId is provided and not already used for problem text
      if (input.fileId && !problemText) {
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
      // Conversation path only uses classifyTurn tool (no checkAnswer, no boardAnnotation)
      const result = streamText({
        model: openai("gpt-4o-mini"),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        tools: {
          classifyTurn: classifyTurnTool,
          evaluate: evaluateTool,
          ...calculatorTools(),
        },
        stopWhen: stepCountIs(5),
      });

      // Process streaming response
      let fullText = "";
      let turnType: TurnClassifierResult["type"] | null = null;
      let toolMetadata: unknown = null;

      // Use fullStream to get both text and tool calls as they happen
      try {
        for await (const chunk of result.fullStream) {
          if (chunk.type === "text-delta") {
            fullText += chunk.text;
            yield { type: "text", content: chunk.text };
          } else if (chunk.type === "tool-call" && "input" in chunk) {
            // Tool calls are handled automatically by the SDK
            // We just track them for metadata
            if (chunk.toolName === "classifyTurn") {
              try {
                const parsed = classifyTurnSchema.parse(chunk.input);
                turnType = parsed.type;
                toolMetadata = { type: parsed.type };
              } catch {
                // Ignore parse errors
              }
            }
          } else if (chunk.type === "tool-result") {
            // Tool execution completed - AI will continue generating text
          } else if (chunk.type === "error") {
            console.error("[AI Router] Stream error:", chunk);
          } else if (chunk.type === "finish") {
            // When finishReason is 'tool-calls', the SDK should continue automatically
            // Don't break - let the stream continue if there are more chunks
            // Only break if it's a final finish (stop, length, etc.)
            if (
              "finishReason" in chunk &&
              chunk.finishReason !== "tool-calls" &&
              chunk.finishReason !== "other"
            ) {
              break;
            }
          }
        }
      } catch (error) {
        console.error("[AI Router] Error processing stream:", error);
        // If we have any text so far, still yield it
        if (fullText.trim()) {
          yield { type: "text", content: fullText };
        }
        throw error;
      }

      // Extract LaTeX from response if present
      const latex = extractLatex(fullText);

      // Persist assistant turn (conversation path always persists)
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
