"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { cn } from "@/lib/utils";

type LikeButtonProps = {
  isbn13: string;
  className?: string;
};

export default function LikeButton({ isbn13, className }: LikeButtonProps) {
  // local state
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // 1. On mount: get current user and fetch like status + count
  useEffect(() => {
    let ignore = false;

    async function init() {
      setLoading(true);

      try {
        const {
          data: sessionData,
          error: sessionErr,
        } = await supabase.auth.getSession();

        if (ignore) return;

        if (sessionErr) {
          console.error("failed to fetch auth session:", sessionErr);
        }

        const user = sessionData?.session?.user ?? null;

        if (user) {
          setUserId(user.id);

          try {
            const { data: existingLike, error: likeErr } = await supabase
              .from("book_like")
              .select("user_id")
              .eq("user_id", user.id)
              .eq("isbn13", isbn13)
              .maybeSingle();

            if (ignore) return;

            if (!likeErr && existingLike) {
              setLiked(true);
            } else if (!likeErr) {
              setLiked(false);
            } else {
              console.error("failed to check like status:", likeErr);
            }
          } catch (err) {
            if (!ignore) console.error("like lookup failed:", err);
          }
        } else {
          // not logged in
          setUserId(null);
          setLiked(false);
        }

        try {
          const { count, error: countErr } = await supabase
            .from("book_like")
            .select("isbn13", { count: "exact", head: true })
            .eq("isbn13", isbn13);

          if (ignore) return;

          if (!countErr && typeof count === "number") {
            setLikeCount(count);
          } else if (countErr) {
            console.error("failed to fetch like count:", countErr);
            setLikeCount(null);
          } else {
            setLikeCount(null);
          }
        } catch (err) {
          if (!ignore) {
            console.error("like count fetch failed:", err);
            setLikeCount(null);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error(`LikeButton init failed for ${isbn13}:`, err);
          setUserId(null);
          setLiked(false);
          setLikeCount(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, [isbn13, supabase]);

  // 2. Click handler for like/unlike
  async function handleToggleLike() {
    // if not logged in, we could redirect to /login
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);

    if (liked) {
      // unlike (delete row)
      const { error: delErr } = await supabase
        .from("book_like")
        .delete()
        .eq("user_id", userId)
        .eq("isbn13", isbn13);

      if (delErr) {
        console.error("unlike failed:", delErr);
      } else {
        setLiked(false);
        setLikeCount(n => {
          if (n === null) return n;
          return Math.max(0, n - 1);
        });
      }
    } else {
      // like (insert row)
      const { error: insErr } = await supabase.from("book_like").insert({
        user_id: userId,
        isbn13,
      });

      if (insErr) {
        console.error("like failed:", insErr);
      } else {
        setLiked(true);
        setLikeCount(n => (n !== null ? n + 1 : 1));
      }
    }

    setLoading(false);
  }

  // 3. Render
  return (
    <button
      onClick={handleToggleLike}
      disabled={loading}
      aria-pressed={liked}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
        liked
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted",
        className
      )}
    >
      <Heart
        className="h-4 w-4"
        strokeWidth={2}
        fill={liked ? "currentColor" : "none"}
      />
      <span>
        좋아요{likeCount !== null ? ` (${likeCount})` : ""}
      </span>
    </button>
  );
}
