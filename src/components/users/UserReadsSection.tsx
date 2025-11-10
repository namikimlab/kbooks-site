"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type PageShowEvent = Event & { persisted?: boolean };

export type UserReadSummary = {
  isbn13: string;
  title: string | null;
  author: string | null;
  readAt: string | null;
  isPrivate: boolean;
};

type UserReadsSectionProps = {
  books: UserReadSummary[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  profileHandle: string;
  profileNickname: string;
  initialSearchParams: Record<string, string>;
  defaultView: "list" | "cover";
  isOwner: boolean;
};

const VIEW_OPTIONS: Array<{ label: string; value: "list" | "cover" }> = [
  { label: "목록", value: "list" },
  { label: "표지", value: "cover" },
];

export function UserReadsSection({
  books,
  totalCount,
  pageSize,
  currentPage,
  profileHandle,
  profileNickname,
  initialSearchParams,
  defaultView,
  isOwner,
}: UserReadsSectionProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshing] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [view, setView] = useState<"list" | "cover">(defaultView);
  const totalPages = Math.max(1, Math.ceil(Math.max(totalCount, 1) / pageSize));
  const [privacyFilter, setPrivacyFilter] = useState<"all" | "public" | "private">("all");
  const filteredBooks = useMemo(() => {
    if (!isOwner) return books;
    if (privacyFilter === "all") return books;
    const shouldShowPrivate = privacyFilter === "private";
    return books.filter(book => book.isPrivate === shouldShowPrivate);
  }, [books, isOwner, privacyFilter]);
  const hasReads = totalCount > 0 && books.length > 0;
  const hasVisibleReads = filteredBooks.length > 0;
  const [removingIsbn, setRemovingIsbn] = useState<string | null>(null);
  const [togglingIsbn, setTogglingIsbn] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const baseSearchParams = useMemo(() => {
    const params = new URLSearchParams(initialSearchParams);
    params.set("tab", "reads");
    return params;
  }, [initialSearchParams]);

  const buildHref = (page: number) => {
    const params = new URLSearchParams(baseSearchParams);
    params.set("readsPage", String(page));
    params.set("readsView", view);
    return `/users/${profileHandle}?${params.toString()}#reads`;
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

  const filterActive = isOwner && privacyFilter !== "all";

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timeout);
  }, [toast]);

  const handleRemoveRead = useCallback(
    async (isbn13: string) => {
      if (!isOwner) return;
      setActionError(null);
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
          .from("user_reads")
          .delete()
          .eq("user_id", user.id)
          .eq("isbn13", isbn13);

        if (error) throw error;

        setToast({ message: "읽은 책에서 제거했어요.", variant: "success" });
        startRefreshing(() => router.refresh());
      } catch (err) {
        console.error("[reads] failed to remove entry", err);
        setActionError("읽은 책 기록을 지우지 못했어요. 다시 시도해 주세요.");
      } finally {
        setRemovingIsbn(prev => (prev === isbn13 ? null : prev));
      }
    },
    [isOwner, supabase, startRefreshing, router]
  );

  const handleTogglePrivacy = useCallback(
    async (book: UserReadSummary) => {
      if (!isOwner) return;
      setActionError(null);
      setTogglingIsbn(book.isbn13);
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

        const nextPrivacy = !book.isPrivate;
        const { error } = await supabase
          .from("user_reads")
          .update({ is_private: nextPrivacy })
          .eq("user_id", user.id)
          .eq("isbn13", book.isbn13);

        if (error) throw error;

        setToast({
          message: nextPrivacy ? "비공개로 전환했어요." : "공개로 전환했어요.",
          variant: "success",
        });
        startRefreshing(() => router.refresh());
      } catch (err) {
        console.error("[reads] failed to toggle privacy", err);
        setActionError("공개 상태를 바꾸지 못했어요. 다시 시도해 주세요.");
      } finally {
        setTogglingIsbn(prev => (prev === book.isbn13 ? null : prev));
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
      {hasReads ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {`총 ${totalCount.toLocaleString()}권을 읽었어요.`}
              {filterActive && (
                <span className="ml-2 text-xs text-muted-foreground/80">
                  현재 {privacyFilter === "private" ? "비공개" : "공개"}만 보고 있어요.
                </span>
              )}
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
              {VIEW_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={view === option.value}
                  onClick={() => setView(option.value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium transition",
                    view === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label} 보기
                </button>
              ))}
            </div>
          </div>
          {isOwner ? (
            <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
              {[
                { label: "전체", value: "all" },
                { label: "공개", value: "public" },
                { label: "비공개", value: "private" },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={privacyFilter === option.value}
                  onClick={() => setPrivacyFilter(option.value as typeof privacyFilter)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition sm:text-sm",
                    privacyFilter === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {actionError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      {showSkeleton ? (
        <ReadsSkeleton variant={hasReads ? view : "list"} />
      ) : !hasReads ? (
        <EmptyReadsState isOwner={isOwner} profileNickname={profileNickname} />
      ) : !hasVisibleReads ? (
        <FilteredReadsEmptyState
          filter={privacyFilter}
          onReset={() => setPrivacyFilter("all")}
        />
      ) : (
        <>
          {view === "list" ? (
            <ReadsList
              books={filteredBooks}
              isOwner={isOwner}
              onRemove={handleRemoveRead}
              removingIsbn={removingIsbn}
              onTogglePrivacy={handleTogglePrivacy}
              togglingIsbn={togglingIsbn}
            />
          ) : (
            <ReadsCoverGrid
              books={filteredBooks}
              isOwner={isOwner}
              onRemove={handleRemoveRead}
              removingIsbn={removingIsbn}
              onTogglePrivacy={handleTogglePrivacy}
              togglingIsbn={togglingIsbn}
            />
          )}
          {totalPages > 1 && (
            <ReadsPagination
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

function EmptyReadsState({ isOwner, profileNickname }: { isOwner: boolean; profileNickname: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
      {isOwner ? (
        <>
          <p className="font-medium text-foreground">아직 기록한 읽은 책이 없어요.</p>
          <p className="mt-2">읽은 책을 기록하면 여기에 모일 거예요. 비공개 옵션도 지원해요.</p>
        </>
      ) : (
        <p>{profileNickname}님이 공개한 읽은 책이 아직 없어요.</p>
      )}
    </div>
  );
}

function FilteredReadsEmptyState({
  filter,
  onReset,
}: {
  filter: "all" | "public" | "private";
  onReset: () => void;
}) {
  const label = filter === "private" ? "비공개" : "공개";
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{label} 기록이 아직 없어요.</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
      >
        필터 초기화
      </button>
    </div>
  );
}

function ReadsList({
  books,
  isOwner,
  onRemove,
  removingIsbn,
  onTogglePrivacy,
  togglingIsbn,
}: {
  books: UserReadSummary[];
  isOwner: boolean;
  onRemove: (isbn13: string) => void;
  removingIsbn: string | null;
  onTogglePrivacy: (book: UserReadSummary) => void;
  togglingIsbn: string | null;
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
                  src={`/api/thumbs/${book.isbn13}`}
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
              {book.readAt ? (
                <time
                  dateTime={book.readAt}
                  className="hidden text-xs text-muted-foreground sm:block"
                >
                  {formatReadDate(book.readAt)}
                </time>
              ) : null}
            </Link>
            {isOwner ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={book.isPrivate ? "비공개에서 공개로 전환" : "공개에서 비공개로 전환"}
                  onClick={() => onTogglePrivacy(book)}
                  disabled={togglingIsbn === book.isbn13}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {book.isPrivate ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  aria-label="읽은 책에서 제거"
                  onClick={() => onRemove(book.isbn13)}
                  disabled={removingIsbn === book.isbn13}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReadsCoverGrid({
  books,
  isOwner,
  onRemove,
  removingIsbn,
  onTogglePrivacy,
  togglingIsbn,
}: {
  books: UserReadSummary[];
  isOwner: boolean;
  onRemove: (isbn13: string) => void;
  removingIsbn: string | null;
  onTogglePrivacy: (book: UserReadSummary) => void;
  togglingIsbn: string | null;
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
                    src={`/api/thumbs/${book.isbn13}`}
                    alt={book.title ?? "책 표지"}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 20vw, 200px"
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                  {isOwner ? (
                    <button
                      type="button"
                      aria-label={book.isPrivate ? "비공개에서 공개로 전환" : "공개에서 비공개로 전환"}
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        onTogglePrivacy(book);
                      }}
                      disabled={togglingIsbn === book.isbn13}
                      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {book.isPrivate ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>
                  ) : null}
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
                aria-label="읽은 책에서 제거"
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

function ReadsPagination({
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

function formatReadDate(iso: string) {
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

function ReadsSkeleton({ variant }: { variant: "list" | "cover" }) {
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
