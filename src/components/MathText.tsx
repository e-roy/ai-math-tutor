"use client";

import { MathRenderer } from "@/components/MathRenderer";
import { parseMathText } from "@/lib/math/render";
import { cn } from "@/lib/utils";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Component that renders text with inline and block math expressions
 * Automatically parses LaTeX delimiters and renders them using KaTeX
 */
export function MathText({ text, className }: MathTextProps) {
  const segments = parseMathText(text);

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.content}</span>;
        }

        return (
          <MathRenderer
            key={index}
            latex={segment.content}
            displayMode={segment.displayMode}
          />
        );
      })}
    </span>
  );
}
