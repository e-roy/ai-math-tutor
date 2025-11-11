import { api } from "@/trpc/react";
import { checkEquivalence } from "@/lib/math/equivalence";
import { useConversationStore } from "@/store/useConversationStore";

export function useAnswerValidation() {
  const incrementAnswerAttempts = useConversationStore(
    (state) => state.incrementAnswerAttempts,
  );
  const setLastAnswerValidation = useConversationStore(
    (state) => state.setLastAnswerValidation,
  );
  const setIsProblemSolved = useConversationStore(
    (state) => state.setIsProblemSolved,
  );

  const verifyEquivalence = api.ai.verifyEquivalence.useMutation();

  const validateAnswer = async (answer: string, expectedAnswer: string) => {
    incrementAnswerAttempts();

    // Client-side check first
    const clientResult = checkEquivalence(answer, expectedAnswer);
    let isValid = clientResult.isEquivalent;

    // Fallback to LLM if confidence is low
    if (clientResult.confidence === "low") {
      try {
        const serverResult = await verifyEquivalence.mutateAsync({
          studentAnswer: answer,
          expectedAnswer,
        });
        isValid = serverResult.isEquivalent;
      } catch (error) {
        console.error("Validation error:", error);
        // Continue with client-side result if server validation fails
      }
    }

    setLastAnswerValidation({ isValid, answer });
    if (isValid) {
      setIsProblemSolved(true);
    }

    return isValid;
  };

  return { validateAnswer };
}

