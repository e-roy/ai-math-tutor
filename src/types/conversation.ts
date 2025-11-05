/**
 * Tutor path type for conversation routing
 */
export type TutorPath = "conversation" | "whiteboard";

/**
 * Extended conversation metadata structure
 * Includes path, topic, grade, and other optional fields
 */
export interface ConversationMeta {
  path?: TutorPath | null;
  topic?: string;
  grade?: string;
  [key: string]: unknown;
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
