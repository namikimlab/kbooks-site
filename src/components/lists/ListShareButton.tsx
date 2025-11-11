"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListShareButtonProps = {
  title: string;
  variant?: "icon" | "inline";
  className?: string;
};

export function ListShareButton({ title, variant = "icon", className }: ListShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showMessage = useCallback(
    (text: string, variant: "success" | "error") => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setStatus(variant);
      setMessage(text);
      timeoutRef.current = setTimeout(() => {
        setStatus("idle");
        setMessage(null);
        timeoutRef.current = null;
      }, 1800);
    },
    []
  );

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          url: shareUrl,
        });
        showMessage("공유했어요!", "success");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showMessage("링크를 복사했어요.", "success");
        return;
      }

      throw new Error("공유 기능을 지원하지 않아요.");
    } catch (err) {
      const name =
        typeof err === "object" && err && "name" in err ? String((err as { name?: string }).name) : "";
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: string }).message)
          : "";
      const canceled =
        name === "AbortError" ||
        name === "NotAllowedError" ||
        /abort|cancel/i.test(message ?? "");

      if (canceled) {
        return;
      }

      console.error("[list-share] failed", err);
      showMessage("공유에 실패했어요.", "error");
    }
  }, [shareUrl, showMessage, title]);

  const isInline = variant === "inline";

  const inlineButton = (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="리스트 공유"
    >
      <Share2 className="h-4 w-4" />
      <span>공유</span>
    </button>
  );

  const iconButton = (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={handleShare}
      aria-label="리스트 공유"
      className="rounded-full border border-transparent hover:border-border"
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );

  return (
    <div
      className={cn(
        "relative",
        isInline ? "inline-flex items-center" : undefined,
        className
      )}
    >
      {isInline ? inlineButton : iconButton}
      {message ? (
        <div
          role="status"
          className={cn(
            "absolute top-full mt-2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium shadow-sm",
            isInline ? "left-1/2 -translate-x-1/2" : "right-0",
            status === "success"
              ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/40"
              : "bg-destructive/10 text-destructive ring-1 ring-destructive/40"
          )}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
