import OpenAI from "openai";
import { env } from "@/lib/env";
import type { EquivalenceResult } from "./equivalence";

const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Use LLM to validate if two math expressions are equivalent
 * Returns structured JSON response with yes/no and reasoning
 */
export async function validateWithLLM(
  studentAnswer: string,
  expectedAnswer: string,
): Promise<EquivalenceResult> {
  const prompt = `You are a math validation expert. Determine if the student's answer is mathematically equivalent to the expected answer.

Student Answer: ${studentAnswer}
Expected Answer: ${expectedAnswer}

Respond with a JSON object in this exact format:
{
  "isEquivalent": true or false,
  "reason": "brief explanation of why they are or are not equivalent"
}

Be strict but reasonable. Allow equivalent forms (e.g., "x=4" and "4=x", "2x+5" and "5+2x").`;

  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a math validation expert. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 200,
    });

    const responseText =
      completion.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(responseText) as {
      isEquivalent?: boolean;
      reason?: string;
    };

    return {
      isEquivalent: parsed.isEquivalent ?? false,
      confidence: "medium",
      reason: parsed.reason ?? "LLM validation completed",
    };
  } catch (error) {
    console.error("LLM validation error:", error);
    return {
      isEquivalent: false,
      confidence: "low",
      reason: "LLM validation failed",
    };
  }
}

/**
 * Combined validation: use mathjs first, fallback to LLM if inconclusive
 */
export async function validateAnswer(
  studentAnswer: string,
  expectedAnswer: string,
): Promise<EquivalenceResult> {
  // First try mathjs validation
  const { checkEquivalence } = await import("./equivalence");
  const mathjsResult = checkEquivalence(studentAnswer, expectedAnswer);

  // If high confidence from mathjs, return it
  if (mathjsResult.confidence === "high") {
    return mathjsResult;
  }

  // If low confidence or inconclusive, use LLM
  if (mathjsResult.confidence === "low" || !mathjsResult.isEquivalent) {
    const llmResult = await validateWithLLM(studentAnswer, expectedAnswer);
    return llmResult;
  }

  // Medium confidence from mathjs - return as is
  return mathjsResult;
}
