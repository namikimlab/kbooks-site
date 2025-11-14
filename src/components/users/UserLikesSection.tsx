"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LayoutGrid, List as ListIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type PageShowEvent = Event & { persisted?: boolean };

export type UserLikeSummary = {
  isbn13: string;
  title: string | null;
  author: string | null;
  likedAt: string | null;
};

type UserLikesSectionProps = {
  books: UserLikeSummary[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  profileHandle: string;
  profileNickname: string;
  initialSearchParams: Record<string, string>;
  defaultView: "list" | "cover";
  isOwner: boolean;
};

const VIEW_OPTIONS: Array<{ label: string; value: "list" | "cover"; icon: ComponentType<{ className?: string }> }> = [
  { label: "목록", value: "list", icon: ListIcon },
  { label: "표지", value: "cover", icon: LayoutGrid },
];

export function UserLikesSection({
  books,
  totalCount,
  pageSize,
  currentPage,
  profileHandle,
  profileNickname,
  initialSearchParams,
  defaultView,
  isOwner,
}: UserLikesSectionProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshing] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [view, setView] = useState<"list" | "cover">(defaultView);
  const totalPages = Math.max(1, Math.ceil(Math.max(totalCount, 1) / pageSize));
  const hasLikes = totalCount > 0 && books.length > 0;
  const [removingIsbn, setRemovingIsbn] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const baseSearchParams = useMemo(() => {
    const params = new URLSearchParams(initialSearchParams);
    params.set("tab", "likes");
    return params;
  }, [initialSearchParams]);

  const buildHref = (page: number) => {
    const params = new URLSearchParams(baseSearchParams);
    params.set("likesPage", String(page));
    params.set("likesView", view);
    return `/users/${profileHandle}?${params.toString()}#likes`;
  };

  useEffect(() => {
    const navigationEntries = performance?.getEntriesByType("navigation") as
      | PerformanceNavigationTiming[]
      | undefined;
    if (navigationEntries?.[0]?.type === "back_forward") {
      startRefreshing(() => router.refresh());
    }
  }, [router, startRefreshing]);

  useEffect(() => {
    const handlePageShow = (event: PageShowEvent) => {
      if (event.persisted) {
        startRefreshing(() => router.refresh());
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router, startRefreshing]);

  const showSkeleton = isRefreshing;

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timeout);
  }, [toast]);

  const handleRemoveLike = useCallback(
    async (isbn13: string) => {
      if (!isOwner) return;
      setRemoveError(null);
      setRemovingIsbn(isbn13);
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          window.location.href = "/login";
          return;
        }

        const { error } = await supabase
          .from("book_like")
          .delete()
          .eq("user_id", user.id)
          .eq("isbn13", isbn13);

        if (error) throw error;

        setToast({ message: "좋아요에서 제거했어요.", variant: "success" });
        startRefreshing(() => router.refresh());
      } catch (err) {
        console.error("[likes] failed to remove like", err);
        setRemoveError("좋아요에서 제거하지 못했어요. 다시 시도해 주세요.");
      } finally {
        setRemovingIsbn(prev => (prev === isbn13 ? null : prev));
      }
    },
    [isOwner, supabase, startRefreshing, router]
  );

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          role="status"
          className={cn(
            "rounded-full border px-4 py-2 text-sm transition",
            toast.variant === "success"
              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700"
              : "border-destructive/60 bg-destructive/10 text-destructive"
          )}
        >
          {toast.message}
        </div>
      ) : null}
      {hasLikes ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {`총 ${totalCount.toLocaleString()}권을 좋아해요.`}
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 p-1 ml-[auto] sm:ml-auto">
            {VIEW_OPTIONS.map(option => {
              const Icon = option.icon;
              const isActive = view === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setView(option.value)}
                  className={cn(
                    "flex items-center justify-center rounded-2xl px-3 py-1.5 transition",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="sr-only">{option.label} 보기</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {removeError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {removeError}
        </p>
      ) : null}

      {showSkeleton ? (
        <LikesSkeleton variant={hasLikes ? view : "list"} />
      ) : !hasLikes ? (
        <EmptyLikesState isOwner={isOwner} profileNickname={profileNickname} />
      ) : (
        <>
          {view === "list" ? (
            <LikesList
              books={books}
              isOwner={isOwner}
              onRemove={handleRemoveLike}
              removingIsbn={removingIsbn}
            />
          ) : (
            <LikesCoverGrid
              books={books}
              isOwner={isOwner}
              onRemove={handleRemoveLike}
              removingIsbn={removingIsbn}
            />
          )}
          {totalPages > 1 && (
            <LikesPagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={buildHref}
            />
          )}
        </>
      )}
    </div>
  );
}

function EmptyLikesState({ isOwner, profileNickname }: { isOwner: boolean; profileNickname: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
      {isOwner ? (
        <>
          <p className="font-medium text-foreground">아직 좋아한 책이 없어요.</p>
          <p className="mt-2">마음에 드는 책을 찾아 응원해 보세요.</p>
        </>
      ) : (
        <p>{profileNickname}님이 아직 좋아요를 남기지 않았어요.</p>
      )}
    </div>
  );
}

function LikesList({
  books,
  isOwner,
  onRemove,
  removingIsbn,
}: {
  books: UserLikeSummary[];
  isOwner: boolean;
  onRemove: (isbn13: string) => void;
  removingIsbn: string | null;
}) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border/70 bg-background/80">
      {books.map(book => (
        <li key={book.isbn13}>
          <div className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/40 focus-within:bg-muted/30">
            <Link
              href={`/books/${book.isbn13}`}
              className="flex flex-1 items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={`/api/thumbs/${book.isbn13}?v=inline`}
                  alt={book.title ?? "책 표지"}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-foreground sm:text-base">
                  {book.title ?? "제목 정보 없음"}
                </span>
                <span className="text-xs text-muted-foreground sm:text-sm">
                  {book.author ?? "저자 정보 없음"}
                </span>
              </div>
              {book.likedAt ? (
                <time
                  dateTime={book.likedAt}
                  className="hidden text-xs text-muted-foreground sm:block"
                >
                  {formatLikedDate(book.likedAt)}
                </time>
              ) : null}
            </Link>
            {isOwner ? (
              <button
                type="button"
                aria-label="좋아요에서 제거"
                onClick={() => onRemove(book.isbn13)}
                disabled={removingIsbn === book.isbn13}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function LikesCoverGrid({
  books,
  isOwner,
  onRemove,
  removingIsbn,
}: {
  books: UserLikeSummary[];
  isOwner: boolean;
  onRemove: (isbn13: string) => void;
  removingIsbn: string | null;
}) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {books.map(book => (
        <li key={book.isbn13}>
          <div className="group relative">
            <Link
              href={`/books/${book.isbn13}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="relative overflow-hidden rounded-xl bg-muted shadow-sm">
                <div className="relative aspect-[2/3] w-full">
                  <Image
                    src={`/api/thumbs/${book.isbn13}?v=inline`}
                    alt={book.title ?? "책 표지"}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 20vw, 200px"
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100">
                    <div className="w-full p-3 text-xs text-white sm:text-sm">
                      <p className="font-semibold leading-tight line-clamp-2">
                        {book.title ?? "제목 정보 없음"}
                      </p>
                      <p className="mt-1 text-[11px] text-white/80">
                        {book.author ?? "저자 정보 없음"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            {isOwner ? (
              <button
                type="button"
                aria-label="좋아요에서 제거"
                onClick={() => onRemove(book.isbn13)}
                disabled={removingIsbn === book.isbn13}
                className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow transition hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function LikesPagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <span>
        {currentPage} / {totalPages}
      </span>
      <div className="flex gap-2">
        {currentPage > 1 && (
          <Link
            href={buildHref(currentPage - 1)}
            className="rounded-full border border-border/70 px-4 py-1.5 font-medium text-foreground transition hover:bg-muted"
          >
            이전
          </Link>
        )}
        {currentPage < totalPages && (
          <Link
            href={buildHref(currentPage + 1)}
            className="rounded-full border border-border/70 px-4 py-1.5 font-medium text-foreground transition hover:bg-muted"
          >
            다음
          </Link>
        )}
      </div>
    </div>
  );
}

function formatLikedDate(iso: string) {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

function LikesSkeleton({ variant }: { variant: "list" | "cover" }) {
  if (variant === "cover") {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="aspect-[2/3] w-full animate-pulse rounded-xl bg-muted/70" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-4 rounded-xl border border-border/70 bg-background/70 px-4 py-3"
        >
          <div className="h-16 w-12 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/80" />
          </div>
          <div className="hidden h-3 w-16 animate-pulse rounded bg-muted/70 sm:block" />
        </div>
      ))}
    </div>
  );
}
