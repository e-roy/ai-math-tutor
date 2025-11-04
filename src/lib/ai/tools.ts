import { z } from "zod";
import { zodSchema } from "ai";

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
 * Compatible with Vercel AI SDK format
 */
export const classifyTurnTool = {
  description:
    "Classify the type of your tutoring response to help the UI display appropriate badges and styling. Use this after every assistant response.",
  inputSchema: zodSchema(classifyTurnSchema),
  execute: async () => {
    // Tool execution is handled in the router
    return {};
  },
};

/**
 * Schema for board annotation tool
 */
export const boardAnnotationSchema = z.object({
  elements: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("box"),
          x: z.number().describe("X coordinate for the box"),
          y: z.number().describe("Y coordinate for the box"),
          width: z.number().describe("Width of the box"),
          height: z.number().describe("Height of the box"),
          label: z
            .string()
            .optional()
            .describe("Optional label text for the box"),
        }),
        z.object({
          type: z.literal("arrow"),
          x1: z.number().describe("Starting X coordinate"),
          y1: z.number().describe("Starting Y coordinate"),
          x2: z.number().describe("Ending X coordinate"),
          y2: z.number().describe("Ending Y coordinate"),
          label: z
            .string()
            .optional()
            .describe("Optional label text for the arrow"),
        }),
        z.object({
          type: z.literal("label"),
          x: z.number().describe("X coordinate for the label"),
          y: z.number().describe("Y coordinate for the label"),
          text: z.string().describe("Text content of the label"),
          fontSize: z.number().optional().describe("Font size (default: 20)"),
        }),
        z.object({
          type: z.literal("latex"),
          x: z.number().describe("X coordinate for the LaTeX element"),
          y: z.number().describe("Y coordinate for the LaTeX element"),
          latex: z.string().describe("LaTeX expression to render"),
          width: z.number().optional().describe("Width (default: 200)"),
          height: z.number().optional().describe("Height (default: 50)"),
        }),
      ]),
    )
    .describe("Array of elements to add to the whiteboard"),
});

export type BoardAnnotationParams = z.infer<typeof boardAnnotationSchema>;

/**
 * Tool definition for adding board annotations
 * Allows the AI to add visual elements (boxes, arrows, labels, LaTeX) to the whiteboard
 */
export const boardAnnotationTool = {
  description:
    "Add visual annotations to the whiteboard to help illustrate concepts, highlight areas, or draw diagrams. Use this when visual aids would help explain the problem or solution process.",
  inputSchema: zodSchema(boardAnnotationSchema),
  execute: async () => {
    // Tool execution is handled in the router
    return {};
  },
};
