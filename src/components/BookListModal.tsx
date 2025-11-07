"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { cn } from "@/lib/utils";

type BookListModalProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  isbn13: string;
  initialSelection: string[];
  onSave: (params: { nextIds: string[]; previousIds: string[] }) => Promise<void> | void;
  createListHref: string;
  onPrepareCreateList: () => void;
};

type UserList = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean | null;
  updated_at: string | null;
};

export default function BookListModal({
  open,
  onClose,
  userId,
  isbn13,
  initialSelection,
  onSave,
  createListHref,
  onPrepareCreateList,
}: BookListModalProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [serverSelection, setServerSelection] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(initialSelection));
    }
  }, [open, initialSelection]);

  const refreshLists = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_lists")
        .select("id,title,description,is_public,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("failed to fetch user lists", error);
        return;
      }

      const typedLists = (data ?? []) as UserList[];
      setLists(typedLists);

      const listIds = typedLists.map(list => list.id);
      if (listIds.length === 0) {
        const fallbackSet = new Set(initialSelection);
        setSelectedIds(fallbackSet);
        setServerSelection(fallbackSet);
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("user_list_books")
        .select("list_id")
        .eq("isbn13", isbn13)
        .in("list_id", listIds);

      if (membershipError) {
        console.error("failed to fetch user_list_books", membershipError);
        return;
      }

      const nextSet = new Set((membership ?? []).map(item => item.list_id as string));
      setSelectedIds(nextSet);
      setServerSelection(nextSet);
    } catch (err) {
      console.error("user list refresh failed", err);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase, isbn13, initialSelection]);

  useEffect(() => {
    if (!open) return;
    void refreshLists();
  }, [open, refreshLists]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const handleFocus = () => {
      void refreshLists();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [open, refreshLists]);

  if (!open) return null;

  const recentLists = lists.slice(0, 3);
  const filteredLists = lists.filter(list => {
    if (!searchTerm.trim()) return true;
    return list.title.toLowerCase().includes(searchTerm.trim().toLowerCase());
  });

  const handleCheckbox = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const nextIds = Array.from(selectedIds);
    const previousIds = Array.from(serverSelection);

    try {
      await onSave({ nextIds, previousIds });
      setServerSelection(new Set(nextIds));
      onClose();
    } catch (err) {
      console.error("save lists failed", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateListClick = () => {
    onPrepareCreateList();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-4 py-6 sm:items-center">
      <div className="relative w-full max-w-lg rounded-2xl bg-background shadow-2xl">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted"
          onClick={onClose}
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex max-h-[80vh] flex-col">
          <div className="border-b px-6 pb-4 pt-6">
            <h2 className="text-lg font-semibold">리스트에 추가</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              최근 사용한 리스트에서 빠르게 선택하거나 전체 리스트를 검색할 수 있어요.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <section>
              <h3 className="text-sm font-semibold text-foreground">최근 사용한 리스트</h3>
              {recentLists.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  아직 저장한 리스트가 없어요.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {recentLists.map(list => (
                    <ListCheckbox
                      key={list.id}
                      title={list.title}
                      description={list.description}
                      checked={selectedIds.has(list.id)}
                      onChange={() => handleCheckbox(list.id)}
                    />
                  ))}
                </ul>
              )}
            </section>

            <div className="mt-4">
              <button
                type="button"
                className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                onClick={() => setShowAll(prev => !prev)}
              >
                {showAll ? "리스트 숨기기" : "모든 리스트 보기"}
              </button>
            </div>

            {showAll && (
              <section className="mt-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="list-search">
                    리스트 검색
                  </label>
                  <input
                    id="list-search"
                    type="search"
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    placeholder="리스트 검색"
                    className="mt-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">리스트를 불러오는 중...</p>
                  ) : filteredLists.length === 0 ? (
                    <p className="text-sm text-muted-foreground">일치하는 리스트가 없어요.</p>
                  ) : (
                    filteredLists.map(list => (
                      <ListCheckbox
                        key={`all-${list.id}`}
                        title={list.title}
                        description={list.description}
                        checked={selectedIds.has(list.id)}
                        onChange={() => handleCheckbox(list.id)}
                      />
                    ))
                  )}
                </div>
              </section>
            )}

            <Link
              href={createListHref}
              prefetch={false}
              onClick={handleCreateListClick}
              className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-dashed border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
            >
              + 새 리스트 만들기
            </Link>
          </div>

          <div className="sticky bottom-0 border-t bg-background px-6 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                onClick={onClose}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ListCheckboxProps = {
  title: string;
  description: string | null;
  checked: boolean;
  onChange: () => void;
};

function ListCheckbox({ title, description, checked, onChange }: ListCheckboxProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
        checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <span>
        <span className="font-medium text-foreground">{title}</span>
        {description ? (
          <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
