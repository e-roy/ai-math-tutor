"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MathAnswerBox } from "@/components/MathAnswerBox";
import { HintButton } from "./HintButton";
import { Send } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  onMathAnswerSubmit: (answer: string, latex?: string) => void;
  onHintRequest: () => void;
  disabled: boolean;
  showMathInput: boolean;
  hintCount?: number;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onMathAnswerSubmit,
  onHintRequest,
  disabled,
  showMathInput,
  hintCount = 0,
}: ChatInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
    onChange("");
  };

  return (
    <div className="space-y-2 border-t p-4">
      {showMathInput && (
        <div className="pb-2">
          <p className="text-muted-foreground mb-2 text-sm">
            Enter your math answer:
          </p>
          <MathAnswerBox onSubmit={onMathAnswerSubmit} disabled={disabled} />
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your message or math problem..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit(e);
              }
            }}
          />
          <div className="flex flex-col gap-2">
            <HintButton
              onRequestHint={onHintRequest}
              disabled={disabled}
              hintCount={hintCount}
            />
            <Button type="submit" disabled={!value.trim() || disabled}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

