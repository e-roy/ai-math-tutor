"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

interface MathRendererProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export function MathRenderer({
  latex,
  displayMode = false,
  className,
}: MathRendererProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const containerRef = displayMode ? divRef : spanRef;

  useEffect(() => {
    if (!containerRef.current || !latex) return;

    try {
      katex.render(latex, containerRef.current, {
        throwOnError: false,
        displayMode,
      });
    } catch (error) {
      console.error("KaTeX rendering error:", error);
      if (containerRef.current) {
        containerRef.current.textContent = `LaTeX: ${latex}`;
      }
    }
  }, [latex, displayMode]);

  if (!latex) return null;

  const defaultClassName = displayMode
    ? "my-4 block text-center"
    : "inline-block";

  if (displayMode) {
    return (
      <div
        ref={divRef}
        className={cn(defaultClassName, className)}
        aria-label={`Math expression: ${latex}`}
      />
    );
  }

  return (
    <span
      ref={spanRef}
      className={cn(defaultClassName, className)}
      aria-label={`Math expression: ${latex}`}
    />
  );
}

