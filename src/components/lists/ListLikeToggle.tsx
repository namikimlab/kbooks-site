"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Heart } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { cn } from "@/lib/utils";

type ListLikeContextValue = {
  liked: boolean;
  count: number;
  loading: boolean;
  toggle: () => Promise<void>;
};

const ListLikeContext = createContext<ListLikeContextValue | null>(null);

type ProviderProps = {
  listId: string;
  initialLiked: boolean;
  initialCount: number;
  children: ReactNode;
};

export function ListLikeProvider({
  listId,
  initialLiked,
  initialCount,
  children,
}: ProviderProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (loading) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from("user_list_like")
          .delete()
          .eq("list_id", listId)
          .eq("user_id", user.id);

        if (error) throw error;
        setLiked(false);
        setCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase.from("user_list_like").insert({
          list_id: listId,
          user_id: user.id,
        });

        if (error) throw error;
        setLiked(true);
        setCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("[list-like] toggle failed", err);
    } finally {
      setLoading(false);
    }
  }, [liked, listId, loading, supabase]);

  return (
    <ListLikeContext.Provider
      value={{
        liked,
        count,
        loading,
        toggle,
      }}
    >
      {children}
    </ListLikeContext.Provider>
  );
}

export function ListLikeToggle({ variant }: { variant: "indicator" | "cta" }) {
  const context = useContext(ListLikeContext);
  if (!context) {
    throw new Error("ListLikeToggle must be used within a ListLikeProvider");
  }

  const { liked, count, loading, toggle } = context;

  if (variant === "indicator") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="flex flex-col items-center gap-1 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-pressed={liked}
      >
        <Heart
          className={cn(
            "h-6 w-6 transition",
            liked ? "text-rose-500 fill-rose-500" : "text-muted-foreground"
          )}
          aria-hidden
        />
        <span>{count.toLocaleString()}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={liked}
      className={cn(
        "mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
        liked ? "bg-rose-600 hover:bg-rose-600/90" : "bg-rose-500 hover:bg-rose-500/90",
        loading && "opacity-80"
      )}
    >
      <Heart className="h-5 w-5" aria-hidden />
      <span>좋은 리스트에요</span>
    </button>
  );
}
