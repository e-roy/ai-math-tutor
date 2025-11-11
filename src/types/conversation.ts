/**
 * Tutor path type for conversation routing
 */
export type TutorPath = "conversation" | "whiteboard";

/**
 * Difficulty level for tutoring scaffolding
 */
export type DifficultyLevel = "support" | "balanced" | "challenge";

/**
 * Socratic teaching phases
 */
export type SocraticPhase =
  | "parse-problem" // Understanding what's given
  | "inventory-knowns" // Identifying known information
  | "identify-goal" // Determining what to find
  | "select-method" // Choosing approach
  | "step-through" // Working through solution
  | "validate-answer"; // Checking the result

/**
 * Extended conversation metadata structure
 * Includes path, topic, grade, difficulty, and other optional fields
 */
export interface ConversationMeta {
  path?: TutorPath | null;
  topic?: string;
  grade?: string;
  difficulty?: DifficultyLevel;
  currentPhase?: SocraticPhase;
  [key: string]: unknown;
}

/**
 * Conversation metadata with explicit phase tracking
 */
export interface ConversationMetadata {
  path?: TutorPath;
  topic?: string;
  grade?: string;
  difficulty?: DifficultyLevel;
  currentPhase?: SocraticPhase;
}

/**
 * Helper to extract path from meta, defaulting to "conversation" for legacy/null values
 */
export function getConversationPath(
  meta: Record<string, unknown> | null | undefined,
): TutorPath {
  const path = (meta as ConversationMeta | undefined)?.path;
  return path === "whiteboard" ? "whiteboard" : "conversation";
}
