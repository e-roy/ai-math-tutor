import type { Turn } from "@/server/db/turns";
import { mapProblemToSkillKeys } from "./skill-mapper";

export interface TrackCompletionParams {
  problemText: string;
  conversationId: string;
  turns: Turn[];
  attempts: number;
  hintsUsed: number;
  isCorrect: boolean;
}

export async function trackProblemCompletion(
  params: TrackCompletionParams,
  updateMasteryMutation: {
    mutateAsync: (input: {
      skillKey: string;
      level: number;
      evidence?: {
        turnIds: string[];
        snapshotIds: string[];
        rubric: {
          accuracy: number;
          method: string;
          explanation: string;
        };
      };
    }) => Promise<{ ok: boolean }>;
  },
) {
  // Map problem to skill keys
  const skillKeys = mapProblemToSkillKeys(params.problemText);

  if (skillKeys.length === 0) {
    console.log("No skill keys mapped for problem:", params.problemText);
    return;
  }

  // Determine mastery level based on performance
  let masteryLevel = 0;
  if (params.isCorrect) {
    if (params.attempts === 1 && params.hintsUsed === 0) {
      masteryLevel = 4; // High mastery
    } else if (params.attempts <= 2 && params.hintsUsed <= 1) {
      masteryLevel = 3; // Good mastery
    } else if (params.attempts <= 3) {
      masteryLevel = 2; // Medium mastery
    } else {
      masteryLevel = 1; // Low mastery
    }
  }

  // Get relevant turn IDs (last 10 turns)
  const relevantTurnIds = params.turns.slice(-10).map((t) => t.id);

  // Update mastery for each detected skill
  for (const skillKey of skillKeys) {
    try {
      await updateMasteryMutation.mutateAsync({
        skillKey,
        level: masteryLevel,
        evidence: {
          turnIds: relevantTurnIds,
          snapshotIds: [],
          rubric: {
            accuracy: params.isCorrect ? 1.0 : 0.0,
            method: `Completed with ${params.attempts} attempts and ${params.hintsUsed} hints`,
            explanation: `Problem: ${params.problemText}`,
          },
        },
      });
      console.log(`✓ Updated mastery for skill: ${skillKey} (level ${masteryLevel})`);
    } catch (error) {
      // Silently log but don't break - skills might not be seeded yet
      console.warn(`Could not update mastery for skill "${skillKey}":`, error instanceof Error ? error.message : error);
      console.info("💡 Tip: Run 'pnpm db:seed' to populate initial skills data");
    }
  }
}

