import {
  checkEquivalence,
  type EquivalenceResult,
} from "@/lib/math/equivalence";
import type { GradingResult } from "@/types/practice";

/**
 * Extract expected answer from problem text if structured
 * Looks for patterns like "answer: 5", "answer = 5", "solution: x=4", etc.
 */
export function extractExpectedAnswer(problemText: string): string | null {
  const text = problemText.trim().toLowerCase();

  // Pattern 1: "answer: 5" or "answer = 5"
  const answerPattern1 = /answer\s*[=:]\s*([^\n]+)/i;
  const match1 = answerPattern1.exec(text);
  if (match1?.[1]) {
    return match1[1].trim();
  }

  // Pattern 2: "solution: x=4" or "solution = x=4"
  const solutionPattern = /solution\s*[=:]\s*([^\n]+)/i;
  const match2 = solutionPattern.exec(text);
  if (match2?.[1]) {
    return match2[1].trim();
  }

  // Pattern 3: "solve: x+5=10" - extract the answer part after "="
  const solvePattern = /solve\s*[=:]\s*[^=]+=\s*([^\n]+)/i;
  const match3 = solvePattern.exec(text);
  if (match3?.[1]) {
    return match3[1].trim();
  }

  return null;
}

/**
 * Compute score and mastery based on student answer, expected answer, attempts, and hints
 * Uses rubric:
 * - Exact match: 1.0, mastery "high"
 * - Equivalent (high confidence): 0.7, mastery "medium"
 * - Partial/close (medium confidence): 0.4, mastery "low"
 * - Incorrect: 0.0, mastery "low"
 * - Penalties: -0.1 per hint (min 0.0), -0.1 if attempts > 3
 */
export function computeScore(
  studentAnswer: string | null,
  expectedAnswer: string | null,
  attempts: number,
  hintsUsed: number,
): GradingResult {
  // If no expected answer, return default low score
  if (!expectedAnswer) {
    return {
      score: 0.0,
      mastery: "low",
      reason: "No expected answer provided for grading",
    };
  }

  // If no student answer, return default low score
  if (!studentAnswer?.trim()) {
    return {
      score: 0.0,
      mastery: "low",
      reason: "No student answer provided",
    };
  }

  // Check equivalence using existing helper
  const equivalenceResult: EquivalenceResult = checkEquivalence(
    studentAnswer.trim(),
    expectedAnswer.trim(),
  );

  // Determine base score based on equivalence
  let baseScore: number;
  let baseMastery: "low" | "medium" | "high";
  let reason: string;

  if (equivalenceResult.isEquivalent) {
    if (equivalenceResult.confidence === "high") {
      // Exact match or high-confidence equivalent
      baseScore = 1.0;
      baseMastery = "high";
      reason = equivalenceResult.reason ?? "Exact match or equivalent";
    } else {
      // Medium confidence equivalent
      baseScore = 0.7;
      baseMastery = "medium";
      reason = equivalenceResult.reason ?? "Equivalent with medium confidence";
    }
  } else {
    if (equivalenceResult.confidence === "medium") {
      // Partial/close match
      baseScore = 0.4;
      baseMastery = "low";
      reason = equivalenceResult.reason ?? "Partial match";
    } else {
      // Incorrect
      baseScore = 0.0;
      baseMastery = "low";
      reason = equivalenceResult.reason ?? "Incorrect answer";
    }
  }

  // Apply penalties
  let finalScore = baseScore;

  // Penalty for hints: -0.1 per hint
  const hintPenalty = hintsUsed * 0.1;
  finalScore = Math.max(0.0, finalScore - hintPenalty);

  // Penalty for excessive attempts: -0.1 if attempts > 3
  if (attempts > 3) {
    finalScore = Math.max(0.0, finalScore - 0.1);
  }

  // Round to 2 decimal places
  finalScore = Math.round(finalScore * 100) / 100;

  // Adjust mastery based on final score
  let finalMastery: "low" | "medium" | "high" = baseMastery;
  if (finalScore >= 0.7) {
    finalMastery = "high";
  } else if (finalScore >= 0.4) {
    finalMastery = "medium";
  } else {
    finalMastery = "low";
  }

  // Build reason string with penalties
  let penaltyNote = "";
  if (hintsUsed > 0) {
    penaltyNote += ` Penalty: -${hintPenalty.toFixed(1)} for ${hintsUsed} hint(s).`;
  }
  if (attempts > 3) {
    penaltyNote += ` Penalty: -0.1 for ${attempts} attempts.`;
  }

  return {
    score: finalScore,
    mastery: finalMastery,
    reason: `${reason}.${penaltyNote}`.trim(),
  };
}
