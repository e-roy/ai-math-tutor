"use client";

import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HintsBadgeProps {
  count: number;
}

export function HintsBadge({ count }: HintsBadgeProps) {
  if (count === 0) return null;

  return (
    <Badge
      className={
        count >= 3
          ? "border-transparent bg-orange-500 text-white hover:bg-orange-600"
          : count >= 1
            ? "border-transparent bg-yellow-500 text-white hover:bg-yellow-600"
            : "border-transparent bg-green-500 text-white hover:bg-green-600"
      }
    >
      <Lightbulb className="mr-1 h-3 w-3" />
      {count} hint{count === 1 ? "" : "s"}
    </Badge>
  );
}

