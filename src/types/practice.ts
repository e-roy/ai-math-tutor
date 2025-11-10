/**
 * Mastery level for practice sessions
 */
export type Mastery = "low" | "medium" | "high";

/**
 * Practice session record matching database schema
 */
export interface PracticeSession {
  id: string;
  userId: string;
  createdAt: Date;
  problemId: string | null;
  conversationId: string | null;
  rawProblemText: string;
  attempts: number; // Deprecated: use chatAttempts + boardAttempts
  chatAttempts: number;
  boardAttempts: number;
  hintsUsed: number;
  timeOnTaskMs: number;
  completion: boolean;
  score: number | null;
  mastery: Mastery | null;
  notes: string | null;
  boardSnapshotBlobRef: string | null;
  studentAnswer: string | null;
  expectedAnswer: string | null;
}

/**
 * Input for creating a practice session
 */
export interface PracticeSessionInput {
  conversationId?: string | null;
  rawProblemText: string;
  attempts: number;
  hintsUsed: number;
  timeOnTaskMs: number;
  completion?: boolean;
  studentAnswer?: string | null;
  expectedAnswer?: string | null;
  boardSnapshotBlobRef?: string | null;
  notes?: string | null;
}

/**
 * Result of grading computation
 */
export interface GradingResult {
  score: number;
  mastery: Mastery;
  reason: string;
}

