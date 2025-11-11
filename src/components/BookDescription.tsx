"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type BookDescriptionProps = {
  text: string;
};

const TOGGLE_THRESHOLD = 240;

export default function BookDescription({ text }: BookDescriptionProps) {
  const displayText = useMemo(() => text.trim(), [text]);
  const [expanded, setExpanded] = useState(false);
  const showToggle = displayText.length > TOGGLE_THRESHOLD;

  if (!displayText) {
    return null;
  }

  return (
    <div className="mt-4 max-w-prose text-sm text-foreground/90">
      <p className={cn("leading-relaxed whitespace-pre-line", !expanded && "line-clamp-5")}>
        {displayText}
      </p>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </div>
  );
}
