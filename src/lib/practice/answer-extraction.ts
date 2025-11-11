/**
 * Extract student answer from chat turns
 * Looks for explicit answer markers first, then falls back to last user turn with math content
 * Prefers LaTeX if available, otherwise uses text
 */
export function extractStudentAnswer(
  turns: Array<{ role: string; text: string | null; latex: string | null }>,
): string | null {
  const userTurns = turns.filter((turn) => turn.role === "user");
  if (userTurns.length === 0) return null;

  const answerMarkers = [
    /(?:my\s+)?(?:final\s+)?answer\s+is\s*[:=]\s*(.+)/i,
    /(?:the\s+)?answer\s+is\s*[:=]\s*(.+)/i,
    /(?:my\s+)?answer\s*[:=]\s*(.+)/i,
    /(?:solution\s+is\s*[:=]\s*(.+))/i,
    /(?:i\s+got\s+)(.+)/i,
    /(?:it\s+is\s+)(.+)/i,
  ];

  for (let i = userTurns.length - 1; i >= 0; i--) {
    const turn = userTurns[i];
    if (!turn) continue;

    if (turn.text) {
      for (const marker of answerMarkers) {
        const match = marker.exec(turn.text);
        if (match?.[1]) {
          const extracted = match[1].trim();
          const cleaned = extracted.replace(/[.,;!?]+$/, "").trim();
          if (cleaned && cleaned.length > 0) {
            if (turn.latex?.trim()) {
              return turn.latex.trim();
            }
            return cleaned;
          }
        }
      }

      const numericMatch = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(turn.text.trim());
      if (numericMatch?.[1]) {
        if (turn.latex?.trim()) {
          return turn.latex.trim();
        }
        return numericMatch[1];
      }
    }
  }

  const lastUserTurn = userTurns[userTurns.length - 1];
  if (!lastUserTurn) return null;

  if (lastUserTurn.latex?.trim()) {
    return lastUserTurn.latex.trim();
  }

  if (lastUserTurn.text?.trim()) {
    const text = lastUserTurn.text.trim();
    const numericMatch = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(text);
    if (numericMatch?.[1]) {
      return numericMatch[1];
    }
    return text;
  }

  return null;
}
