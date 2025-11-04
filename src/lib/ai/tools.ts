import { z } from "zod";
import type { TurnType } from "@/types/ai";

/**
 * Schema for the turn classifier tool
 */
export const classifyTurnSchema = z.object({
  type: z.enum(["ask", "hint", "validate", "refocus"]),
});

export type ClassifyTurnParams = z.infer<typeof classifyTurnSchema>;

/**
 * Tool definition for classifying tutor turns
 * This helps the UI understand the purpose of each assistant response
 */
export const classifyTurnTool = {
  type: "function" as const,
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
};

