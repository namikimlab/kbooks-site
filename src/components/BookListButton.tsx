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
  className?: string;
};

export default function BookListButton({ isbn13, className }: BookListButtonProps) {
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
      const response = await fetch("/api/user-list-memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn13, nextIds, previousIds }),
        credentials: "same-origin",
      });

      let payload: {
        addedIds?: string[];
        removedIds?: string[];
        limitExceededIds?: string[];
        error?: string;
      } = {};

      try {
        payload = (await response.json()) as typeof payload;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        const message = payload?.error ?? "리스트 저장에 실패했어요.";
        setToast({ message, variant: "error" });
        throw new Error(message);
      }

      const addedIds = payload?.addedIds ?? [];
      const removedIds = payload?.removedIds ?? [];
      const limitExceededIds = payload?.limitExceededIds ?? [];

      setSelectedListIds(nextIds);

      if (limitExceededIds.length > 0) {
        setToast({
          message: `일부 리스트는 최대 ${MAX_BOOKS_PER_LIST}권까지 담을 수 있어요.`,
          variant: "error",
        });
      } else if (addedIds.length > 0 || removedIds.length > 0) {
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
    <div className="w-full">
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={loading}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted",
          className
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        <span>
          리스트 담기
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
    </div>
  );
}
