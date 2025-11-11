"use client";

import { useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useConversationStore } from "@/store/useConversationStore";

export function AnswerValidationBadge() {
  const lastAnswerValidation = useConversationStore(
    (state) => state.lastAnswerValidation,
  );
  const setLastAnswerValidation = useConversationStore(
    (state) => state.setLastAnswerValidation,
  );

  // Auto-hide success badge after 5 seconds
  useEffect(() => {
    if (lastAnswerValidation?.isValid) {
      const timer = setTimeout(() => {
        setLastAnswerValidation(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastAnswerValidation, setLastAnswerValidation]);

  if (!lastAnswerValidation?.isValid) return null;

  return (
    <Badge className="border-transparent bg-green-500 text-white hover:bg-green-600">
      <CheckCircle className="mr-1 h-3 w-3" />
      Correct!
    </Badge>
  );
}

