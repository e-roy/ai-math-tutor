/**
 * Parse text to extract LaTeX math expressions
 * Supports delimiters: $...$ (inline), \(...\) (inline), \[...\] (display)
 */

export type MathSegment = {
  type: "text" | "math";
  content: string;
  displayMode: boolean;
};

/**
 * Parse text and extract LaTeX math expressions
 * Returns array of segments (text or math)
 */
export function parseMathText(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let currentIndex = 0;

  // Match display math first: \[...\]
  const displayPattern = /\\\[([^\]]+)\\\]/g;
  // Match inline math: \(...\) or $...$
  const inlinePattern = /(?:\\\(([^)]+)\\\)|\$([^$]+)\$)/g;

  // Find all math expressions
  const mathMatches: Array<{
    start: number;
    end: number;
    content: string;
    displayMode: boolean;
  }> = [];

  // Find display math
  let match;
  while ((match = displayPattern.exec(text)) !== null) {
    mathMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1]?.trim() ?? "",
      displayMode: true,
    });
  }

  // Find inline math (avoid overlapping with display math)
  displayPattern.lastIndex = 0;
  while ((match = inlinePattern.exec(text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    const content = match[1] ?? match[2] ?? "";

    // Skip if this overlaps with a display math match
    const overlaps = mathMatches.some((m) => start < m.end && end > m.start);
    if (!overlaps) {
      mathMatches.push({
        start,
        end,
        content: content.trim(),
        displayMode: false,
      });
    }
  }

  // Sort matches by start position
  mathMatches.sort((a, b) => a.start - b.start);

  // Build segments
  for (const mathMatch of mathMatches) {
    // Add text segment before this math
    if (mathMatch.start > currentIndex) {
      const textContent = text.slice(currentIndex, mathMatch.start);
      if (textContent) {
        segments.push({
          type: "text",
          content: textContent,
          displayMode: false,
        });
      }
    }

    // Add math segment
    if (mathMatch.content) {
      segments.push({
        type: "math",
        content: mathMatch.content,
        displayMode: mathMatch.displayMode,
      });
    }

    currentIndex = mathMatch.end;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const textContent = text.slice(currentIndex);
    if (textContent) {
      segments.push({
        type: "text",
        content: textContent,
        displayMode: false,
      });
    }
  }

  // If no math found, return single text segment
  if (segments.length === 0) {
    return [
      {
        type: "text",
        content: text,
        displayMode: false,
      },
    ];
  }

  return segments;
}
