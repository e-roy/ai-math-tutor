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

/**
 * Schema for math addition tool
 */
export const addSchema = z.object({
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
});

export type AddParams = z.infer<typeof addSchema>;

/**
 * Schema for math subtraction tool
 */
export const subtractSchema = z.object({
  a: z.number().describe("First number (minuend)"),
  b: z.number().describe("Second number (subtrahend)"),
});

export type SubtractParams = z.infer<typeof subtractSchema>;

/**
 * Schema for math multiplication tool
 */
export const multiplySchema = z.object({
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
});

export type MultiplyParams = z.infer<typeof multiplySchema>;

/**
 * Schema for math division tool
 */
export const divideSchema = z.object({
  a: z.number().describe("Dividend (number to be divided)"),
  b: z.number().describe("Divisor (number to divide by)"),
});

export type DivideParams = z.infer<typeof divideSchema>;

/**
 * Schema for math evaluation tool
 */
export const evaluateSchema = z.object({
  expression: z
    .string()
    .min(1)
    .describe(
      "Mathematical expression to evaluate (e.g., '2 + 2', '3 * 4', '10 / 2')",
    ),
});

export type EvaluateParams = z.infer<typeof evaluateSchema>;

/**
 * Math operation tools for solving problems step-by-step
 */
export const addTool = {
  description:
    "Add two numbers together. Use this for addition operations when solving math problems step-by-step.",
  inputSchema: zodSchema(addSchema),
  execute: async (input: AddParams) => {
    const result = input.a + input.b;
    return {
      result,
      operation: `${input.a} + ${input.b}`,
    };
  },
};

export const subtractTool = {
  description:
    "Subtract one number from another. Use this for subtraction operations when solving math problems step-by-step.",
  inputSchema: zodSchema(subtractSchema),
  execute: async (input: SubtractParams) => {
    const result = input.a - input.b;
    return {
      result,
      operation: `${input.a} - ${input.b}`,
    };
  },
};

export const multiplyTool = {
  description:
    "Multiply two numbers together. Use this for multiplication operations when solving math problems step-by-step.",
  inputSchema: zodSchema(multiplySchema),
  execute: async (input: MultiplyParams) => {
    const result = input.a * input.b;
    return {
      result,
      operation: `${input.a} * ${input.b}`,
    };
  },
};

export const divideTool = {
  description:
    "Divide one number by another. Use this for division operations when solving math problems step-by-step. Returns an error if dividing by zero.",
  inputSchema: zodSchema(divideSchema),
  execute: async (input: DivideParams) => {
    if (input.b === 0) {
      return {
        error: "Cannot divide by zero",
        operation: `${input.a} / ${input.b}`,
      };
    }
    const result = input.a / input.b;
    return {
      result,
      operation: `${input.a} / ${input.b}`,
    };
  },
};

export const evaluateTool = {
  description:
    "Evaluate a mathematical expression (e.g., '2 + 2', '3 * 4 - 1', '10 / 2'). Use this for complex expressions or when you need to evaluate a full expression at once. Supports basic arithmetic operations: +, -, *, /, parentheses.",
  inputSchema: zodSchema(evaluateSchema),
  execute: async (input: EvaluateParams) => {
    try {
      // Import mathjs dynamically to avoid circular dependencies
      const { evaluate } = await import("mathjs");
      const result: unknown = evaluate(input.expression);
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
        return {
          result,
          expression: input.expression,
        };
      }
      return {
        error: "Expression did not evaluate to a valid number",
        expression: input.expression,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to evaluate expression",
        expression: input.expression,
      };
    }
  },
};

/**
 * Schema for answer checking tool
 */
export const checkAnswerSchema = z.object({
  studentAnswer: z
    .string()
    .min(1)
    .describe("The numeric or mathematical answer provided by the student"),
  problemText: z
    .string()
    .min(1)
    .describe("The problem text to solve (e.g., '2 + 2', 'What is 5 * 3?')"),
});

export type CheckAnswerParams = z.infer<typeof checkAnswerSchema>;

/**
 * Tool definition for checking if a student's answer is correct
 * Allows the AI to verify numeric/mathematical answers and respond appropriately
 * Solves the problem using the same math operations, then compares with student answer
 */
export const checkAnswerTool = {
  description:
    "Check if the student's numeric or mathematical answer is correct. Use this when the student provides a specific answer (e.g., 'the answer is 5', 'I got 42', 'x equals 3'). This tool will solve the problem using math operations and compare the result with the student's answer.",
  inputSchema: zodSchema(checkAnswerSchema),
  execute: async (input: CheckAnswerParams) => {
    try {
      // Import mathjs dynamically to avoid circular dependencies
      const { evaluate } = await import("mathjs");

      // Extract the math expression from problem text
      // Handle formats like "2 + 2", "What is 5 * 3?", "Solve: 10 / 2", etc.
      let problemExpression = input.problemText.trim();

      // Remove common question prefixes
      problemExpression = problemExpression
        .replace(
          /^(what is|what's|solve|calculate|compute|find|evaluate)\s*:?\s*/i,
          "",
        )
        .replace(/[?.,!]+$/, "")
        .trim();

      // Solve the problem
      let solvedAnswer: number;
      const steps: string[] = [];
      try {
        const solved: unknown = evaluate(problemExpression);
        if (typeof solved === "number" && !isNaN(solved) && isFinite(solved)) {
          solvedAnswer = solved;
          steps.push(`Solved: ${problemExpression} = ${solvedAnswer}`);
        } else {
          return {
            isCorrect: false,
            error: "Problem expression did not evaluate to a valid number",
            problemText: input.problemText,
            steps: [],
          };
        }
      } catch (error) {
        return {
          isCorrect: false,
          error:
            error instanceof Error
              ? `Failed to solve problem: ${error.message}`
              : "Failed to solve problem",
          problemText: input.problemText,
          steps: [],
        };
      }

      // Evaluate student answer
      let studentAnswerValue: number;
      try {
        // Clean student answer - extract just the numeric/math part
        let studentExpr = input.studentAnswer.trim();
        // Remove common answer prefixes
        studentExpr = studentExpr
          .replace(
            /^(the answer is|answer is|answer|it's|it is|i got|i have|equals?|is)\s*:?\s*/i,
            "",
          )
          .replace(/[?.,!]+$/, "")
          .trim();

        const studentEval: unknown = evaluate(studentExpr);
        if (
          typeof studentEval === "number" &&
          !isNaN(studentEval) &&
          isFinite(studentEval)
        ) {
          studentAnswerValue = studentEval;
          steps.push(
            `Student answer evaluated: ${studentExpr} = ${studentAnswerValue}`,
          );
        } else {
          return {
            isCorrect: false,
            error: "Student answer did not evaluate to a valid number",
            solvedAnswer,
            problemText: input.problemText,
            steps,
          };
        }
      } catch (error) {
        return {
          isCorrect: false,
          error:
            error instanceof Error
              ? `Failed to evaluate student answer: ${error.message}`
              : "Failed to evaluate student answer",
          solvedAnswer,
          problemText: input.problemText,
          steps,
        };
      }

      // Compare answers (allow small floating point differences)
      const tolerance = 1e-10;
      const isCorrect = Math.abs(solvedAnswer - studentAnswerValue) < tolerance;

      return {
        isCorrect,
        solvedAnswer,
        studentAnswer: studentAnswerValue,
        steps,
        problemText: input.problemText,
      };
    } catch (error) {
      return {
        isCorrect: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        problemText: input.problemText,
        steps: [],
      };
    }
  },
};
