"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import BookListModal from "@/components/BookListModal";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { cn } from "@/lib/utils";
import { MAX_BOOKS_PER_LIST } from "@/constants/lists";

const REOPEN_FLAG_KEY = "kbooks:list-modal:reopen";

type BookListButtonProps = {
  isbn13: string;
};

export default function BookListButton({ isbn13 }: BookListButtonProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null
  );
  const [pendingReopen, setPendingReopen] = useState(false);

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
          console.error("failed to fetch auth session (lists)", sessionErr);
        }

        if (!ignore) {
          setUserId(sessionData?.session?.user?.id ?? null);
        }
      } catch (err) {
        if (!ignore) {
          console.error("BookListButton session fetch failed", err);
          setUserId(null);
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
  }, [supabase]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(REOPEN_FLAG_KEY);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { isbn13?: string } | null;
      if (payload?.isbn13 === isbn13) {
        window.sessionStorage.removeItem(REOPEN_FLAG_KEY);
        setPendingReopen(true);
      }
    } catch {
      window.sessionStorage.removeItem(REOPEN_FLAG_KEY);
    }
  }, [isbn13]);

  useEffect(() => {
    if (!pendingReopen) return;
    if (loading || !userId) return;
    setModalOpen(true);
    setPendingReopen(false);
  }, [pendingReopen, loading, userId]);

  useEffect(() => {
    if (!userId) {
      setSelectedListIds([]);
      return;
    }

    let ignore = false;
    async function loadSelections() {
      try {
        const { data, error } = await supabase
          .from("user_list_book")
          .select("list_id,user_list!inner(user_id)")
          .eq("isbn13", isbn13)
          .eq("user_list.user_id", userId);

        if (ignore) return;

        if (error) {
          console.error("failed to fetch list memberships", error);
          return;
        }

        setSelectedListIds((data ?? []).map(entry => entry.list_id as string));
      } catch (err) {
        if (!ignore) {
          console.error("list membership fetch failed", err);
        }
      }
    }

    void loadSelections();

    return () => {
      ignore = true;
    };
  }, [userId, isbn13, supabase]);

  const currentPath = useMemo(() => {
    const safePath = pathname ?? "/";
    const query = searchParams?.toString();
    return query && query.length > 0 ? `${safePath}?${query}` : safePath;
  }, [pathname, searchParams]);

  const createListHref = useMemo(() => {
    return `/lists/new?next=${encodeURIComponent(currentPath)}`;
  }, [currentPath]);

  const handleOpenModal = () => {
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    setModalOpen(true);
  };

  const handleSaveLists = async ({
    nextIds,
    previousIds,
  }: {
    nextIds: string[];
    previousIds: string[];
  }) => {
    try {
      const prevSet = new Set(previousIds);
      const nextSet = new Set(nextIds);

      let toAdd = nextIds.filter(id => !prevSet.has(id));
      const toRemove = previousIds.filter(id => !nextSet.has(id));

      if (toAdd.length > 0) {
        const { data: countRows, error: countError } = await supabase
          .from("user_list_book")
          .select("list_id")
          .in("list_id", toAdd);

        if (countError) throw countError;

        const countMap = new Map<string, number>();
        for (const row of countRows ?? []) {
          const id = row.list_id as string;
          if (!id) continue;
          countMap.set(id, (countMap.get(id) ?? 0) + 1);
        }

        const filteredAdds = toAdd.filter(listId => {
          const count = countMap.get(listId) ?? 0;
          if (count >= MAX_BOOKS_PER_LIST) {
            return false;
          }
          countMap.set(listId, count + 1);
          return true;
        });

        if (filteredAdds.length !== toAdd.length) {
          setToast({
            message: `리스트는 최대 ${MAX_BOOKS_PER_LIST}권까지 담을 수 있어요.`,
            variant: "error",
          });
        }

        toAdd = filteredAdds;
      }

      if (toAdd.length === 0 && toRemove.length === 0) {
        return;
      }

      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("user_list_book")
          .upsert(
            toAdd.map(listId => ({
              list_id: listId,
              isbn13,
            })),
            { onConflict: "list_id,isbn13" }
          );

        if (insertError) throw insertError;
      }

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_list_book")
          .delete()
          .eq("isbn13", isbn13)
          .in("list_id", toRemove);

        if (deleteError) throw deleteError;
      }

      setSelectedListIds(nextIds);
      if (toAdd.length > 0 || toRemove.length > 0) {
        setToast({ message: "리스트에 저장했어요.", variant: "success" });
      }
    } catch (err) {
      console.error("book list save failed", err);
      setToast({ message: "리스트 저장에 실패했어요.", variant: "error" });
      throw err;
    }
  };

  const handlePrepareCreateList = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(REOPEN_FLAG_KEY, JSON.stringify({ isbn13 }));
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        <span>
          리스트에 추가
          {selectedListIds.length ? ` (${selectedListIds.length})` : ""}
        </span>
      </button>

      {modalOpen && userId ? (
        <BookListModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          userId={userId}
          isbn13={isbn13}
          initialSelection={selectedListIds}
          onSave={handleSaveLists}
          createListHref={createListHref}
          onPrepareCreateList={handlePrepareCreateList}
        />
      ) : null}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div
            role="status"
            aria-live="assertive"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium shadow-lg",
              toast.variant === "success"
                ? "bg-foreground text-background"
                : "bg-destructive text-destructive-foreground"
            )}
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
