"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type BookDescriptionProps = {
  text: string | null | undefined;
};

const FALLBACK_TEXT = "소개 정보가 아직 없습니다.";

export default function BookDescription({ text }: BookDescriptionProps) {
  const normalized = useMemo(() => text?.trim() ?? "", [text]);
  const isFallback = normalized.length === 0;
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setExpanded(false);
  }, [normalized]);

  useLayoutEffect(() => {
    if (isFallback) {
      setHasOverflow(false);
      return;
    }

    if (expanded) {
      setHasOverflow(true);
      return;
    }

    const el = paragraphRef.current;
    if (!el) return;

    const checkOverflow = () => {
      const overflow = el.scrollHeight - el.clientHeight > 1;
      setHasOverflow(overflow);
    };

    checkOverflow();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(checkOverflow);
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [normalized, expanded, isFallback]);

  const showToggle = !isFallback && hasOverflow;

  return (
    <div className="mt-4 w-full max-w-prose text-sm text-foreground/90">
      <p
        ref={paragraphRef}
        className={cn(
          "whitespace-pre-line leading-relaxed",
          !isFallback && !expanded && "line-clamp-5"
        )}
      >
        {isFallback ? FALLBACK_TEXT : normalized}
      </p>

      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="mt-2 text-xs font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </div>
  );
}
