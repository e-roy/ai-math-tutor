"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MathRenderer } from "@/app/(app)/app/conversation/_components/MathRenderer";
import { parse } from "mathjs";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface MathAnswerBoxProps {
  onSubmit: (answer: string, latex?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Component for entering math answers
 * Accepts plain math expressions and can optionally convert to LaTeX
 */
export function MathAnswerBox({
  onSubmit,
  placeholder = "Enter your answer (e.g., x=4, 2x+5=13)",
  disabled = false,
  className,
}: MathAnswerBoxProps) {
  const [input, setInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parsedLatex, setParsedLatex] = useState<string | null>(null);

  // Basic validation: try to parse the expression
  const validateInput = (value: string): boolean => {
    if (!value.trim()) {
      setValidationError(null);
      setParsedLatex(null);
      return false;
    }

    try {
      // Try to parse the expression
      parse(value.trim());
      setValidationError(null);
      // For now, we'll use the input as-is for LaTeX
      // In a more advanced version, we could convert to LaTeX
      setParsedLatex(value.trim());
      return true;
    } catch (error) {
      setValidationError("Invalid math expression");
      setParsedLatex(null);
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    validateInput(value);
  };

  const handleSubmit = () => {
    if (!input.trim() || disabled || isValidating) return;

    const isValid = validateInput(input);
    if (!isValid) return;

    setIsValidating(true);
    onSubmit(input.trim(), parsedLatex ?? undefined);
    // Reset after a short delay to show feedback
    setTimeout(() => {
      setInput("");
      setParsedLatex(null);
      setValidationError(null);
      setIsValidating(false);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasValidInput = input.trim() && !validationError;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isValidating}
            className={cn(
              "pr-10",
              validationError && "border-destructive",
              hasValidInput && "border-green-500",
            )}
          />
          {hasValidInput && !isValidating && (
            <CheckCircle2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-green-500" />
          )}
          {validationError && !isValidating && (
            <XCircle className="text-destructive absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
          )}
          {isValidating && (
            <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
          )}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!hasValidInput || disabled || isValidating}
          size="default"
        >
          {isValidating ? "Submitting..." : "Submit"}
        </Button>
      </div>
      {validationError && (
        <p className="text-destructive text-sm">{validationError}</p>
      )}
      {parsedLatex && !validationError && (
        <div className="bg-muted/50 rounded-md border p-2">
          <p className="text-muted-foreground mb-1 text-xs">Preview:</p>
          <MathRenderer latex={parsedLatex} displayMode={false} />
        </div>
      )}
    </div>
  );
}
