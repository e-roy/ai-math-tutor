import type { ProblemType } from "@/lib/ai/problem-detector";

/**
 * Map problem type to a user-friendly topic label
 */
export function detectTopic(
  problemText: string,
  problemType: ProblemType,
): string {
  const topicMap: Record<ProblemType, string> = {
    arithmetic: "Arithmetic",
    algebra: "Algebra",
    geometry: "Geometry",
    "word-problem": "Word Problems",
    "multi-step": "Multi-Step Problems",
    unknown: "General Math",
  };

  return topicMap[problemType] || "General Math";
}

/**
 * Infer grade level from problem text and complexity
 * Uses child grade if available, otherwise infers from problem characteristics
 */
export function inferGrade(
  problemText: string,
  childGrade?: string,
): string {
  // Use childGrade if available
  if (childGrade) {
    return childGrade;
  }

  const text = problemText.toLowerCase();

  // K-2: Simple single-digit arithmetic
  if (/^\s*\d\s*[+\-]\s*\d\s*$/.test(text)) {
    const numbers = problemText.match(/\d+/g);
    if (numbers && numbers.every((n) => parseInt(n) <= 10)) {
      return "K-2";
    }
  }

  // 3-5: Multi-digit arithmetic, basic multiplication/division
  if (/[×*÷/]/.test(text) || /\d{2,}/.test(text)) {
    if (!(/[a-z]\s*[=+\-*/]/.test(text))) {
      return "3-5";
    }
  }

  // 6-8: Algebra, fractions, percentages
  if (
    /[a-z]\s*[=+\-*/]/.test(text) ||
    /fraction|percent|ratio/.test(text) ||
    /\d+\/\d+/.test(text)
  ) {
    return "6-8";
  }

  // 9-12: Advanced algebra, quadratic, trigonometry
  if (
    /quadratic|polynomial|trigonometry|sine|cosine|tangent|x\^2/.test(text) ||
    /\^\d+/.test(text)
  ) {
    return "9-12";
  }

  // Default to unspecified
  return "Not specified";
}

