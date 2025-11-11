export type ProblemType =
  | "arithmetic"
  | "algebra"
  | "geometry"
  | "word-problem"
  | "multi-step"
  | "unknown";

export function detectProblemType(problemText: string): ProblemType {
  const text = problemText.toLowerCase();

  // Algebra indicators
  if (/[a-z]\s*[=+\-*/]|solve for|find [a-z]|[a-z]\s*=/.test(text)) {
    return "algebra";
  }

  // Geometry indicators
  if (
    /triangle|circle|square|rectangle|angle|perimeter|area|volume|diameter|radius/i.test(
      text,
    )
  ) {
    return "geometry";
  }

  // Word problem indicators (longer text with context)
  if (
    text.split(" ").length > 10 &&
    /has|have|bought|sold|total|each|if.*then/i.test(text)
  ) {
    return "word-problem";
  }

  // Multi-step (contains multiple operations or steps)
  if ((text.match(/[+\-*/=]/g) || []).length >= 3) {
    return "multi-step";
  }

  // Arithmetic (simple numeric operations)
  if (/^\s*\d+\s*[+\-*/]\s*\d+/.test(text)) {
    return "arithmetic";
  }

  return "unknown";
}

export function getProblemTypeGuidance(type: ProblemType): string {
  const guidance = {
    arithmetic: "Guide the student through the basic operation step by step.",
    algebra:
      "Help the student identify the variable, what they know, and what steps isolate the variable. Use inverse operations.",
    geometry:
      "Guide the student to identify the shape, known measurements, and which formula applies.",
    "word-problem":
      "Help the student extract the key information, identify what is being asked, then translate to math.",
    "multi-step":
      "Break the problem into smaller steps. Guide them through one step at a time, checking understanding.",
    unknown: "Analyze the problem with the student to understand what is being asked.",
  };
  return guidance[type];
}

