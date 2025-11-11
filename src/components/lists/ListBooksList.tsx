"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ListBookItem = {
  isbn13: string;
  title: string | null;
  author: string | null;
  position: number | null;
};

type ListBooksListProps = {
  listId: string;
  books: ListBookItem[];
  isOwner: boolean;
};

function reorder<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function ListBooksList({ listId, books, isOwner }: ListBooksListProps) {
  const [items, setItems] = useState(() =>
    books.map((book, index) => ({
      ...book,
      position: book.position ?? index + 1,
    }))
  );
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const touch = window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    setIsTouchDevice(Boolean(touch));
  }, []);

  const persistOrder = useCallback(
    async (nextItems: typeof items) => {
      setIsSaving(true);
      setError(null);
      try {
        const response = await fetch(`/api/user-lists/${listId}/positions`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            positions: nextItems.map((item, index) => ({
              isbn13: item.isbn13,
              position: index + 1,
            })),
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "순서를 저장하지 못했어요.");
        }
      } catch (err) {
        console.error("[list-books] reorder failed", err);
        setError(err instanceof Error ? err.message : "순서를 저장하지 못했어요.");
      } finally {
        setIsSaving(false);
      }
    },
    [listId]
  );

  const handleDrop = useCallback(
    (toIndex: number) => (event: React.DragEvent<HTMLLIElement>) => {
      if (!isOwner) return;
      event.preventDefault();
      const fromIndex = Number(event.dataTransfer.getData("text/plain"));
      if (!Number.isInteger(fromIndex) || fromIndex === toIndex) {
        setDraggingIndex(null);
        return;
      }

      setItems(prev => {
        const nextOrder = reorder(prev, fromIndex, toIndex).map((item, index) => ({
          ...item,
          position: index + 1,
        }));
        void persistOrder(nextOrder);
        return nextOrder;
      });
      setDraggingIndex(null);
    },
    [isOwner, persistOrder]
  );

  const handleDragStart = useCallback(
    (index: number) => (event: React.DragEvent<HTMLButtonElement>) => {
      if (!isOwner) return;
      setDraggingIndex(index);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    },
    [isOwner]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLIElement>) => {
    if (!isOwner) return;
    event.preventDefault();
  }, [isOwner]);

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handleMove = useCallback(
    (fromIndex: number, direction: "up" | "down") => {
      setItems(prev => {
        const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= prev.length) {
          return prev;
        }
        const nextOrder = reorder(prev, fromIndex, toIndex).map((item, index) => ({
          ...item,
          position: index + 1,
        }));
        void persistOrder(nextOrder);
        return nextOrder;
      });
    },
    [persistOrder]
  );

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {isSaving ? (
        <p className="text-xs text-muted-foreground">순서를 저장하는 중...</p>
      ) : null}
      <ul className="space-y-3">
        {items.map((book, index) => {
          const order = book.position ?? index + 1;
          const isDragging = draggingIndex === index;
          return (
            <li
              key={book.isbn13}
              className="flex items-stretch gap-3 py-1 pl-2 pr-1"
              onDragOver={handleDragOver}
              onDrop={handleDrop(index)}
            >
              <span className="w-5 text-right text-lg font-semibold text-amber-800 sm:text-xl">
                {order}
              </span>
              <div
                className={cn(
                  "flex flex-1 items-center gap-3 rounded-2xl bg-muted/40 px-3 py-2.5 transition",
                  isDragging ? "bg-muted/60" : ""
                )}
              >
                <Link
                  href={`/books/${book.isbn13}`}
                  className="flex flex-1 items-center gap-4"
                >
                  <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-background">
                    <Image
                      src={`/api/thumbs/${book.isbn13}?v=inline`}
                      alt={book.title ?? "책 표지"}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-2 text-lg font-semibold text-foreground">
                      {book.title ?? "제목 정보 없음"}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {book.author ?? "저자 정보 없음"}
                    </span>
                  </div>
                </Link>
                {isOwner ? (
                  isTouchDevice ? (
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={event => {
                          event.preventDefault();
                          handleMove(index, "up");
                        }}
                        className="rounded-full border border-border/40 p-1.5 text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                        aria-label="위로 이동"
                        disabled={index === 0 || isSaving}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={event => {
                          event.preventDefault();
                          handleMove(index, "down");
                        }}
                        className="rounded-full border border-border/40 p-1.5 text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                        aria-label="아래로 이동"
                        disabled={index === items.length - 1 || isSaving}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      draggable
                      onDragStart={handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={event => event.stopPropagation()}
                      className="rounded-full p-2 text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="리스트 순서 변경"
                      onClick={event => event.preventDefault()}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  )
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
