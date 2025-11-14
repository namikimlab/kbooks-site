"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { cn } from "@/lib/utils";

type ListSaveContextValue = {
  saved: boolean;
  count: number;
  loading: boolean;
  toggle: () => Promise<void>;
};

const ListSaveContext = createContext<ListSaveContextValue | null>(null);

type ProviderProps = {
  listId: string;
  initialSaved: boolean;
  initialCount: number;
  children: ReactNode;
};

export function ListSaveProvider({
  listId,
  initialSaved,
  initialCount,
  children,
}: ProviderProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (loading) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const next = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setLoading(true);
    try {
      if (saved) {
        const { error } = await supabase
          .from("user_list_save")
          .delete()
          .eq("list_id", listId)
          .eq("user_id", user.id);

        if (error) throw error;
        setSaved(false);
        setCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase.from("user_list_save").insert({
          list_id: listId,
          user_id: user.id,
        });

        if (error) throw error;
        setSaved(true);
        setCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("[list-save] toggle failed", err);
    } finally {
      setLoading(false);
    }
  }, [saved, listId, loading, supabase, router]);

  return (
    <ListSaveContext.Provider
      value={{
        saved,
        count,
        loading,
        toggle,
      }}
    >
      {children}
    </ListSaveContext.Provider>
  );
}

export function ListSaveToggle({ variant }: { variant: "indicator" | "cta" }) {
  const context = useContext(ListSaveContext);
  if (!context) {
    throw new Error("ListSaveToggle must be used within a ListSaveProvider");
  }

  const { saved, count, loading, toggle } = context;

  if (variant === "indicator") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="flex flex-col items-center gap-1 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-pressed={saved}
      >
        <Star
          className={cn("h-6 w-6 transition", saved ? "text-amber-500" : "text-muted-foreground")}
          strokeWidth={saved ? 0 : 2}
          fill={saved ? "currentColor" : "none"}
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
      aria-pressed={saved}
      className={cn(
        "mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        saved ? "bg-amber-600 hover:bg-amber-600/90" : "bg-amber-500 hover:bg-amber-500/90",
        loading && "opacity-80"
      )}
    >
      <Star
        className="h-5 w-5"
        strokeWidth={saved ? 0 : 2}
        fill={saved ? "currentColor" : "none"}
        aria-hidden
      />
      <span>{saved ? "저장 완료" : "리스트 저장하기"}</span>
    </button>
  );
}
