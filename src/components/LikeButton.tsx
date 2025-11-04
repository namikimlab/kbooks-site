"use client";

import { useEffect, useMemo, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClients";

type LikeButtonProps = {
  isbn13: string;
};

export default function LikeButton({ isbn13 }: LikeButtonProps) {
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

      // get the logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (user) {
        setUserId(user.id);

        // did THIS user already like this book?
        const { data: existingLike, error: likeErr } = await supabase
          .from("book_likes")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("isbn13", isbn13)
          .maybeSingle();

        if (!likeErr && existingLike) {
          setLiked(true);
        }
      } else {
        // not logged in
        setUserId(null);
        setLiked(false);
      }

      // get total like count (public aggregate; RLS shouldn't block counting)
      // note: this is a naive public count. if RLS blocks this later,
      // we can expose a read-only view or RPC. for now let's try direct.
      const { data: countRows, error: countErr } = await supabase
        .from("book_likes")
        .select("isbn13", { count: "exact", head: true })
        .eq("isbn13", isbn13);

      if (!countErr && typeof countRows?.length !== "undefined") {
        // supabase js returns count in a weird place:
        // countRows is an empty array because head:true
        // but `count` lives on the response itself, not data
        // we don't have direct access here unless we destructure differently.
        // So let's re-do this without head:true to keep it simple.
      }

      // simple version: actually fetch rows and count in JS
      const { data: allLikes, error: allErr } = await supabase
        .from("book_likes")
        .select("user_id")
        .eq("isbn13", isbn13);

      if (!allErr && allLikes) {
        setLikeCount(allLikes.length);
      } else {
        setLikeCount(null);
      }

      setLoading(false);
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
        .from("book_likes")
        .delete()
        .eq("user_id", userId)
        .eq("isbn13", isbn13);

      if (delErr) console.error("unlike failed:", delErr);
      else {
        setLiked(false);
        setLikeCount((n) => (n !== null ? n - 1 : n));
      }
    } else {
       // like (insert row)
      const { error: insErr } = await supabase.from("book_likes").insert({
        user_id: userId,
        isbn13
      });

      if (insErr) console.error("like failed:", insErr);
      else{
        setLiked(true);
        setLikeCount((n) => (n !== null ? n + 1 : 1));
      }
    }

    setLoading(false);
  }

  // 3. Render
  return (
    <button
      onClick={handleToggleLike}
      disabled={loading}
      className={`mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm
        ${
          liked
            ? "border-transparent bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground hover:bg-muted"
        }`}
    >
      <ThumbsUp
        className={`h-4 w-4 ${liked ? "opacity-100" : "opacity-60"}`}
        strokeWidth={2}
      />
      <span className="font-medium">
        추천해요
        {likeCount !== null ? ` (${likeCount})` : ""}
      </span>
    </button>
  );
}
