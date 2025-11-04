/**
 * Turn classification types for UI guidance
 */
export type TurnType = "ask" | "hint" | "validate" | "refocus";

/**
 * Result from the turn classifier tool
 */
export interface TurnClassifierResult {
  type: TurnType;
}

/**
 * Message structure for chat UI
 */
export interface TurnMessage {
  id: string;
  role: "user" | "assistant";
  text: string | null;
  latex: string | null;
  turnType?: TurnType | null;
  createdAt: Date;
}

