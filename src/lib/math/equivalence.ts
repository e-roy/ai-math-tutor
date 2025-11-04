import { evaluate, simplify, parse, type MathNode } from "mathjs";

export type EquivalenceResult = {
  isEquivalent: boolean;
  confidence: "high" | "medium" | "low";
  reason?: string;
};

/**
 * Type guard to check if a node is a SymbolNode
 */
function isSymbolNode(node: MathNode): node is MathNode & { name: string } {
  return node.type === "SymbolNode" && "name" in node;
}

/**
 * Extract variables from a math expression
 */
function extractVariables(expr: string): string[] {
  try {
    const node = parse(expr);
    const variables: Set<string> = new Set();

    node.traverse((node) => {
      if (isSymbolNode(node)) {
        // Skip constants like pi, e, etc.
        const constants = ["pi", "e", "PI", "E", "true", "false"];
        if (!constants.includes(node.name.toLowerCase())) {
          variables.add(node.name);
        }
      }
    });

    return Array.from(variables);
  } catch {
    return [];
  }
}

/**
 * Generate random values for variables
 */
function generateRandomValues(variables: string[]): Record<string, number> {
  const values: Record<string, number> = {};
  for (const varName of variables) {
    // Generate random integer between -10 and 10
    values[varName] = Math.floor(Math.random() * 21) - 10;
  }
  return values;
}

/**
 * Evaluate expression with given variable values
 */
function evaluateWithValues(
  expr: string,
  values: Record<string, number>,
): number | null {
  try {
    const scope = { ...values };
    const result = evaluate(expr, scope);
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if two expressions are equivalent using simplification
 */
function checkSimplification(
  studentExpr: string,
  expectedExpr: string,
): boolean {
  try {
    const studentSimplified = simplify(studentExpr).toString();
    const expectedSimplified = simplify(expectedExpr).toString();

    // Direct string comparison after simplification
    if (studentSimplified === expectedSimplified) {
      return true;
    }

    // Try subtracting and checking if result is zero
    const diff = simplify(
      parse(`(${studentExpr}) - (${expectedExpr})`),
    ).toString();
    const diffSimplified = simplify(diff);

    // If difference simplifies to 0, they're equivalent
    try {
      const diffValue = evaluate(diffSimplified.toString());
      if (typeof diffValue === "number" && Math.abs(diffValue) < 1e-10) {
        return true;
      }
    } catch {
      // Continue to numeric checks
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check equivalence using randomized numeric substitution
 */
function checkNumericEquivalence(
  studentExpr: string,
  expectedExpr: string,
  numTrials = 5,
): { passed: number; total: number } {
  const allVariables = new Set([
    ...extractVariables(studentExpr),
    ...extractVariables(expectedExpr),
  ]);

  if (allVariables.size === 0) {
    // No variables, try direct evaluation
    try {
      const studentVal = evaluate(studentExpr);
      const expectedVal = evaluate(expectedExpr);
      if (
        typeof studentVal === "number" &&
        typeof expectedVal === "number" &&
        Math.abs(studentVal - expectedVal) < 1e-10
      ) {
        return { passed: numTrials, total: numTrials };
      }
      return { passed: 0, total: numTrials };
    } catch {
      return { passed: 0, total: numTrials };
    }
  }

  let passed = 0;
  const variables = Array.from(allVariables);

  for (let i = 0; i < numTrials; i++) {
    const values = generateRandomValues(variables);
    const studentVal = evaluateWithValues(studentExpr, values);
    const expectedVal = evaluateWithValues(expectedExpr, values);

    if (
      studentVal !== null &&
      expectedVal !== null &&
      Math.abs(studentVal - expectedVal) < 1e-10
    ) {
      passed++;
    }
  }

  return { passed, total: numTrials };
}

/**
 * Check if student answer is equivalent to expected answer
 * Uses simplification + randomized numeric checks
 */
export function checkEquivalence(
  studentAnswer: string,
  expectedAnswer: string,
): EquivalenceResult {
  // Clean inputs
  const student = studentAnswer.trim();
  const expected = expectedAnswer.trim();

  if (student === expected) {
    return {
      isEquivalent: true,
      confidence: "high",
      reason: "Exact match",
    };
  }

  // Try simplification check
  try {
    if (checkSimplification(student, expected)) {
      return {
        isEquivalent: true,
        confidence: "high",
        reason: "Expressions simplify to the same form",
      };
    }
  } catch (error) {
    // Continue to numeric checks
  }

  // Try numeric substitution checks
  const numericCheck = checkNumericEquivalence(student, expected, 5);

  if (numericCheck.passed === numericCheck.total) {
    return {
      isEquivalent: true,
      confidence: "high",
      reason: "All numeric substitution checks passed",
    };
  }

  if (numericCheck.passed >= numericCheck.total * 0.8) {
    return {
      isEquivalent: true,
      confidence: "medium",
      reason: "Most numeric substitution checks passed",
    };
  }

  if (numericCheck.passed > 0) {
    return {
      isEquivalent: false,
      confidence: "low",
      reason: "Some numeric checks failed, may need LLM validation",
    };
  }

  return {
    isEquivalent: false,
    confidence: "low",
    reason: "Expressions do not appear equivalent",
  };
}
