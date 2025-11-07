"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { cn } from "@/lib/utils";

type Visibility = "public" | "private" | null;

type BookReadButtonProps = {
  isbn13: string;
};

export default function BookReadButton({ isbn13 }: BookReadButtonProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // fetch user + existing read state
  useEffect(() => {
    let ignore = false;

    async function init() {
      setLoading(true);
      try {
        const {
          data: sessionData,
          error: sessionErr,
        } = await supabase.auth.getSession();

        if (sessionErr) {
          console.error("failed to fetch auth session: book-read", sessionErr);
        }

        if (ignore) return;

        const user = sessionData?.session?.user ?? null;
        setUserId(user?.id ?? null);

        if (user) {
          const { data, error } = await supabase
            .from("user_reads")
            .select("is_private")
            .eq("user_id", user.id)
            .eq("isbn13", isbn13)
            .maybeSingle();

          if (!ignore) {
            if (error) {
              console.error("failed to load user_reads", error);
            } else if (data) {
              setVisibility(data.is_private ? "private" : "public");
            } else {
              setVisibility(null);
            }
          }
        } else {
          setVisibility(null);
        }
      } catch (err) {
        if (!ignore) {
          console.error("book read init failed", err);
          setUserId(null);
          setVisibility(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      ignore = true;
    };
  }, [isbn13, supabase]);

  // close menu on outside click/escape
  useEffect(() => {
    if (!menuOpen) return;

    function handlePointer(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const recorded = visibility !== null;
  const buttonLabel =
    visibility === "private"
      ? "읽었어요 (비공개)"
      : visibility === "public"
      ? "읽었어요 (공개)"
      : "읽었어요";

  function handlePrimaryClick() {
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    setMenuOpen(prev => !prev);
  }

  async function handleSelect(isPrivate: boolean) {
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_reads")
        .upsert(
          {
            user_id: userId,
            isbn13,
            is_private: isPrivate,
          },
          { onConflict: "user_id,isbn13" }
        );

      if (error) {
        console.error("failed to upsert user_reads", error);
      } else {
        setVisibility(isPrivate ? "private" : "public");
      }
    } catch (err) {
      console.error("user_reads update failed", err);
    } finally {
      setLoading(false);
      setMenuOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handlePrimaryClick}
        disabled={loading}
        aria-expanded={menuOpen}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
          recorded
            ? "border-transparent bg-emerald-500 text-emerald-50 hover:bg-emerald-500/90"
            : "border-border bg-background text-foreground hover:bg-muted"
        )}
      >
        <Check className="h-4 w-4" strokeWidth={2} />
        <span>{buttonLabel}</span>
      </button>

      {menuOpen && (
        <div className="absolute left-0 z-20 mt-2 w-52 rounded-md border border-border bg-background p-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => handleSelect(true)}
            disabled={loading}
            className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-muted"
          >
            <span>읽었어요 (비공개)</span>
            {visibility === "private" && <Check className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => handleSelect(false)}
            disabled={loading}
            className="mt-1 flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-muted"
          >
            <span>읽었어요 (공개)</span>
            {visibility === "public" && <Check className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
