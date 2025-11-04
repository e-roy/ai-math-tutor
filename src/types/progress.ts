/**
 * Mastery level (0-4)
 * 0 = not started
 * 1-4 = progressing levels
 */
export type MasteryLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Evidence structure for mastery records
 */
export interface Evidence {
  turnIds: string[];
  snapshotIds: string[];
  rubric: {
    accuracy: number;
    method: string;
    explanation: string;
  };
}

/**
 * Domain with grouped skills
 */
export interface DomainGroup {
  domain: string;
  gradeBand: string;
  skills: SkillWithMastery[];
}

/**
 * Skill with mastery information
 */
export interface SkillWithMastery {
  id: string;
  standardId: string;
  topic: string;
  subtopic: string | null;
  key: string;
  description: string | null;
  standard: {
    id: string;
    domain: string;
    code: string;
    gradeBand: string;
    description: string | null;
  };
  mastery: {
    id: string;
    level: MasteryLevel;
    evidence: Evidence | Record<string, unknown>;
    updatedAt: Date;
  } | null;
}

/**
 * Progress overview structure
 */
export interface ProgressOverview {
  domains: DomainGroup[];
}

