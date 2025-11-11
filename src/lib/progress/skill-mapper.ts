import { detectProblemType } from "@/lib/ai/problem-detector";

export function mapProblemToSkillKeys(problemText: string): string[] {
  const type = detectProblemType(problemText);
  const text = problemText.toLowerCase();

  const skillKeys: string[] = [];

  if (type === "arithmetic") {
    if (/\+/.test(text)) skillKeys.push("addition-basic");
    if (/-/.test(text)) skillKeys.push("subtraction-basic");
  }

  if (type === "algebra") {
    // Check for one-step vs two-step
    const operations = (text.match(/[+\-*/]/g) || []).length;
    if (operations <= 1) {
      skillKeys.push("linear-equations-one-step");
    } else {
      skillKeys.push("linear-equations-two-step");
    }
  }

  if (type === "geometry") {
    if (/area.*rectangle|rectangle.*area/.test(text)) {
      skillKeys.push("area-rectangle");
    }
    if (/perimeter/.test(text)) {
      skillKeys.push("perimeter-basic");
    }
  }

  return skillKeys;
}

