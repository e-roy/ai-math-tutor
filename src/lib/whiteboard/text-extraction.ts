import type { ExcalidrawScene } from "@/types/board";

/**
 * Extract text from Excalidraw scene elements
 * Looks for text elements and extracts their text content
 */
export function extractTextFromScene(scene: ExcalidrawScene): string {
  if (!scene.elements || !Array.isArray(scene.elements)) {
    return "";
  }

  const textParts: string[] = [];

  for (const element of scene.elements) {
    // Check if element is a text element
    if (
      element &&
      typeof element === "object" &&
      "type" in element &&
      element.type === "text" &&
      "text" in element &&
      typeof element.text === "string"
    ) {
      const text = element.text.trim();
      if (text) {
        textParts.push(text);
      }
    }
  }

  return textParts.join(" ").trim();
}

/**
 * Extract numeric answer from whiteboard text
 * Looks for numbers, math expressions, or patterns like "= 4" or "answer: 5"
 */
export function extractAnswerFromText(text: string): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Remove common prefixes and clean up text
  let cleaned = text.trim();

  // Look for patterns like "= 4", "answer: 5", "=4", etc.
  const answerPatterns = [
    /(?:^|\s)(?:answer|result|solution|equals?|is)\s*[:=]\s*([+-]?\d+(?:\.\d+)?)/i,
    /(?:^|\s)(?:=)\s*([+-]?\d+(?:\.\d+)?)/,
    /(?:^|\s)([+-]?\d+(?:\.\d+)?)\s*$/,
  ];

  for (const pattern of answerPatterns) {
    const match = pattern.exec(cleaned);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  // If no pattern matches, look for standalone numbers
  // Extract the last number in the text (likely the answer)
  const numberMatches = cleaned.match(/([+-]?\d+(?:\.\d+)?)/g);
  if (numberMatches && numberMatches.length > 0) {
    // Return the last number found (most likely the final answer)
    return numberMatches[numberMatches.length - 1] ?? null;
  }

  // If no numbers found, return the cleaned text as-is (might be a math expression)
  return cleaned || null;
}

/**
 * Extract answer from whiteboard scene
 * Combines text extraction and answer parsing
 */
export function extractAnswerFromScene(scene: ExcalidrawScene): string | null {
  const text = extractTextFromScene(scene);
  if (!text) {
    return null;
  }

  return extractAnswerFromText(text);
}

