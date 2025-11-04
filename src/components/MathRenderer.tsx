"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

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
  const containerRef = useRef<HTMLSpanElement>(null);

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

  return (
    <span
      ref={containerRef}
      className={className}
      aria-label={`Math expression: ${latex}`}
    />
  );
}

