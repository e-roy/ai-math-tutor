/**
 * Generate a short title from problem text (OCR or user message)
 * @param text - The problem text to generate a title from
 * @returns A short title (max 60 characters)
 */
export function generateTitleFromProblem(text: string): string {
  if (!text || text.trim().length === 0) {
    return "New Conversation";
  }

  // Clean up common prefixes
  let cleaned = text
    .replace(/^(The|This)?\s*(math\s*)?problem\s*(text|is|from|extracted)?\s*:?\s*/i, "")
    .replace(/^(Here|This)\s*(is|shows)\s*(the\s*)?(math\s*)?(problem\s*)?:?\s*/i, "")
    .replace(/^(Solve|Find|Calculate|Evaluate|Compute)\s*:?\s*/i, "")
    .trim();

  // If empty after cleaning, use original
  if (!cleaned) {
    cleaned = text.trim();
  }

  // Take first line or first sentence
  const firstLine = cleaned.split("\n")[0]?.trim() ?? cleaned;
  const firstSentence = firstLine.split(/[.!?]/)[0]?.trim() ?? firstLine;

  // Remove LaTeX markers if present
  let title = firstSentence.replace(/\$[^$]+\$/g, "math").replace(/\\\([^)]+\\\)/g, "math").replace(/\\\[[^\]]+\\\]/g, "math");

  // Limit length
  const maxLength = 60;
  if (title.length > maxLength) {
    title = title.substring(0, maxLength - 3) + "...";
  }

  // If still empty, return default
  if (!title || title.trim().length === 0) {
    return "New Conversation";
  }

  return title.trim();
}

