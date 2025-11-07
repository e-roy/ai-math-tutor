import { zodSchema } from "ai";
import { z } from "zod";

type CalculatorTools =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "exponentiate"
  | "factorial"
  | "isPrime"
  | "squareRoot"
  | "sin"
  | "cos"
  | "tan"
  | "sqrt"
  | "log"
  | "exp";

export const calculatorTools = (config?: {
  excludeTools?: CalculatorTools[];
}): Partial<
  Record<
    CalculatorTools,
    {
      description: string;
      inputSchema: ReturnType<typeof zodSchema>;
      execute: (input: unknown) => Promise<unknown>;
    }
  >
> => {
  const tools: Partial<
    Record<
      CalculatorTools,
      {
        description: string;
        inputSchema: ReturnType<typeof zodSchema>;
        execute: (input: unknown) => Promise<unknown>;
      }
    >
  > = {
    add: {
      description: "Add two numbers and return the result",
      inputSchema: zodSchema(
        z.object({
          a: z.number().describe("First number"),
          b: z.number().describe("Second number"),
        }),
      ),
      execute: async (input: unknown) => {
        const { a, b } = input as { a: number; b: number };
        return add(a, b);
      },
    },
    subtract: {
      description: "Subtract second number from first and return the result",
      inputSchema: zodSchema(
        z.object({
          a: z.number().describe("First number"),
          b: z.number().describe("Second number"),
        }),
      ),
      execute: async (input: unknown) => {
        const { a, b } = input as { a: number; b: number };
        return subtract(a, b);
      },
    },
    multiply: {
      description: "Multiply two numbers and return the result",
      inputSchema: zodSchema(
        z.object({
          a: z.number().describe("First number"),
          b: z.number().describe("Second number"),
        }),
      ),
      execute: async (input: unknown) => {
        const { a, b } = input as { a: number; b: number };
        return multiply(a, b);
      },
    },
    divide: {
      description: "Divide first number by second and return the result",
      inputSchema: zodSchema(
        z.object({
          a: z.number().describe("Numerator"),
          b: z.number().describe("Denominator"),
        }),
      ),
      execute: async (input: unknown) => {
        const { a, b } = input as { a: number; b: number };
        return divide(a, b);
      },
    },
    exponentiate: {
      description: "Raise first number to the power of the second number",
      inputSchema: zodSchema(
        z.object({
          a: z.number().describe("Base"),
          b: z.number().describe("Exponent"),
        }),
      ),
      execute: async (input: unknown) => {
        const { a, b } = input as { a: number; b: number };
        return exponentiate(a, b);
      },
    },
    factorial: {
      description: "Calculate the factorial of a number",
      inputSchema: zodSchema(
        z.object({
          n: z.number().int().describe("Number to calculate the factorial of"),
        }),
      ),
      execute: async (input: unknown) => {
        const { n } = input as { n: number };
        return factorial(n);
      },
    },
    isPrime: {
      description: "Check if a number is prime",
      inputSchema: zodSchema(
        z.object({
          n: z.number().int().describe("Number to check if prime"),
        }),
      ),
      execute: async (input: unknown) => {
        const { n } = input as { n: number };
        return isPrime(n);
      },
    },
    squareRoot: {
      description: "Calculate the square root of a number",
      inputSchema: zodSchema(
        z.object({
          n: z.number().describe("Number to calculate the square root of"),
        }),
      ),
      execute: async (input: unknown) => {
        const { n } = input as { n: number };
        return squareRoot(n);
      },
    },
    sin: {
      description: "Calculate the sine of an angle in radians",
      inputSchema: zodSchema(
        z.object({
          n: z.number().describe("Angle in radians"),
        }),
      ),
      execute: async (input: unknown) => {
        const { n } = input as { n: number };
        return sin(n);
      },
    },
    cos: {
      description: "Calculate the cosine of an angle in radians",
      inputSchema: zodSchema(
        z.object({
          n: z.number().describe("Angle in radians"),
        }),
      ),
      execute: async (input: unknown) => {
        const { n } = input as { n: number };
        return cos(n);
      },
    },
    tan: {
      description: "Calculate the tangent of an angle in radians",
      inputSchema: zodSchema(
        z.object({
          n: z.number().describe("Angle in radians"),
        }),
      ),
      execute: async (input: unknown) => {
        const { n } = input as { n: number };
        return tan(n);
      },
    },
    sqrt: {
      description:
        "Calculate the square root of a number (alias for squareRoot)",
      inputSchema: zodSchema(
        z.object({
          n: z.number().describe("Number to calculate the square root of"),
        }),
      ),
      execute: async (input: unknown) => {
        const { n } = input as { n: number };
        return squareRoot(n);
      },
    },
    log: {
      description: "Calculate the natural logarithm (base e) of a number",
      inputSchema: zodSchema(
        z.object({
          n: z.number().describe("Number to calculate the logarithm of"),
        }),
      ),
      execute: async (input: unknown) => {
        const { n } = input as { n: number };
        return log(n);
      },
    },
    exp: {
      description: "Calculate e raised to the power of a number",
      inputSchema: zodSchema(
        z.object({
          n: z.number().describe("Power to raise e to"),
        }),
      ),
      execute: async (input: unknown) => {
        const { n } = input as { n: number };
        return exp(n);
      },
    },
  };

  for (const toolName in tools) {
    if (config?.excludeTools?.includes(toolName as CalculatorTools)) {
      delete tools[toolName as CalculatorTools];
    }
  }

  return tools;
};

function add(a: number, b: number) {
  return { result: a + b };
}

function subtract(a: number, b: number) {
  return { result: a - b };
}

function multiply(a: number, b: number) {
  return { result: a * b };
}

function divide(a: number, b: number) {
  if (b === 0) {
    return { error: "Cannot divide by zero" };
  }
  try {
    return { result: a / b };
  } catch (error) {
    return { error };
  }
}

function exponentiate(a: number, b: number) {
  return { result: a ** b };
}

function factorial(n: number) {
  if (n < 0) {
    return { error: "Factorial is not defined for negative numbers" };
  }
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return { result };
}

function isPrime(n: number) {
  if (n <= 1) {
    return { result: false };
  }
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      return { result: false };
    }
  }
  return { result: true };
}

function squareRoot(n: number) {
  if (n < 0) {
    return { error: "Square Root is not defined for negative numbers" };
  }
  return { result: Math.sqrt(n) };
}

function sin(n: number) {
  return { result: Math.sin(n) };
}

function cos(n: number) {
  return { result: Math.cos(n) };
}

function tan(n: number) {
  return { result: Math.tan(n) };
}

function log(n: number) {
  if (n <= 0) {
    return { error: "Logarithm is not defined for non-positive numbers" };
  }
  return { result: Math.log(n) };
}

function exp(n: number) {
  return { result: Math.exp(n) };
}
