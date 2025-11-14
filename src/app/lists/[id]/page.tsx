import Link from "next/link";
import { notFound } from "next/navigation";

import { ListBooksList } from "@/components/lists/ListBooksList";
import { ListCoverCollage } from "@/components/lists/ListCoverCollage";
import { ListShareButton } from "@/components/lists/ListShareButton";
import { ListSaveProvider, ListSaveToggle } from "@/components/lists/ListSaveToggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BookRow } from "@/lib/books";
import { createSupabaseServerClient } from "@/lib/supabaseServerClients";
import { Pencil, BookOpen, Lock, Unlock } from "lucide-react";

export const dynamic = "force-dynamic";

type ListPageParams = {
  id: string;
};

type ListPageSearchParams = {
  view?: string;
};

type ListRow = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean | null;
  updated_at: string | null;
  created_at: string | null;
  user_id: string;
};

type OwnerProfileRow = {
  id: string;
  handle: string;
  nickname: string | null;
  avatar_url: string | null;
};

type DisplayBook = {
  isbn13: string;
  title: string | null;
  author: string | null;
  position: number | null;
};

type BasicBookRow = Pick<BookRow, "isbn13" | "title" | "author">;

const META_ITEM_CLASS =
  "inline-flex items-center gap-2 text-xs font-medium text-muted-foreground whitespace-nowrap";

export default async function UserListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<ListPageParams>;
  searchParams: Promise<ListPageSearchParams>;
}) {
  const [{ id }] = await Promise.all([params, searchParams]);

  if (!id) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: list, error: listError }, authResult] = await Promise.all([
    supabase
      .from("user_list")
      .select("id, title, description, is_public, updated_at, created_at, user_id")
      .eq("id", id)
      .maybeSingle<ListRow>(),
    supabase.auth.getUser(),
  ]);

  if (listError) {
    console.error(`[list-detail] failed to fetch user_list id=${id}`, listError);
  }

  if (!list) {
    notFound();
  }

  const viewerId = authResult.data.user?.id ?? null;
  const isOwner = viewerId === list.user_id;
  const isPublic = Boolean(list.is_public);

  if (!isOwner && !isPublic) {
    notFound();
  }

  const [
    { data: ownerProfile, error: ownerError },
    { data: membershipRows, error: membershipError },
    { count: savesCountRaw, error: savesCountError },
  ] = await Promise.all([
    supabase
      .from("user_profile")
      .select("id, handle, nickname, avatar_url")
      .eq("id", list.user_id)
      .maybeSingle<OwnerProfileRow>(),
    supabase
      .from("user_list_book")
      .select("isbn13, position")
      .eq("list_id", list.id)
      .order("position", { ascending: true, nullsFirst: false })
      .order("isbn13", { ascending: true }),
    supabase
      .from("user_list_save")
      .select("list_id", { count: "exact", head: true })
      .eq("list_id", list.id),
  ]);

  if (ownerError) {
    console.error(`[list-detail] failed to fetch owner profile user_id=${list.user_id}`, ownerError);
  }

  if (membershipError) {
    console.error(`[list-detail] failed to fetch books for list id=${list.id}`, membershipError);
  }

  if (savesCountError) {
    console.error(`[list-detail] failed to fetch saves count for list id=${list.id}`, savesCountError);
  }

  const owner: OwnerProfileRow = ownerProfile ?? {
    id: list.user_id,
    handle: "unknown",
    nickname: "사용자",
    avatar_url: null,
  };

  const savesCount = savesCountRaw ?? 0;

  let viewerSaved = false;
  if (viewerId) {
    const { data: savedRow, error: savedError } = await supabase
      .from("user_list_save")
      .select("user_id")
      .eq("list_id", list.id)
      .eq("user_id", viewerId)
      .maybeSingle();
    if (savedError) {
      console.error(`[list-detail] failed to fetch viewer save state for list id=${list.id}`, savedError);
    } else {
      viewerSaved = Boolean(savedRow);
    }
  }

  const orderedRows = (membershipRows ?? []).filter(
    (row): row is { isbn13: string; position: number | null } => Boolean(row.isbn13)
  );
  const isbnList = orderedRows.map(row => row.isbn13);

  let booksLookup = new Map<string, BasicBookRow>();
  if (isbnList.length > 0) {
    const { data: bookRows, error: booksError } = await supabase
      .from("book")
      .select("isbn13, title, author")
      .in("isbn13", isbnList);

    if (booksError) {
      console.error(`[list-detail] failed to fetch book metadata for list id=${list.id}`, booksError);
    } else if (bookRows) {
      booksLookup = new Map(bookRows.map(row => [row.isbn13, row as BasicBookRow]));
    }
  }

  const books: DisplayBook[] = orderedRows.map(row => {
    const meta = booksLookup.get(row.isbn13) ?? null;
    return {
      isbn13: row.isbn13,
      title: meta?.title ?? null,
      author: meta?.author ?? null,
      position: row.position ?? null,
    };
  });

  const bookCount = books.length;
  return (
    <ListSaveProvider
      listId={list.id}
      initialSaved={viewerSaved}
      initialCount={savesCount}
    >
      <section className="mx-auto px-2 py-4 max-w-6xl">
      <header className="space-y-4">
        <ListCoverCollage isbnList={books.map(book => book.isbn13)} />
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {list.title}
          </h1>
          {list.description ? (
            <p className="max-w-3xl whitespace-pre-line break-words text-base leading-relaxed text-muted-foreground">
              {list.description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
            <Link
              href={`/users/${owner.handle}?tab=lists`}
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${owner.nickname ?? owner.handle} 프로필로 이동`}
            >
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage
                  src={owner.avatar_url ?? undefined}
                  alt={`${owner.handle} 아바타`}
                  className="object-cover"
                />
                <AvatarFallback>{ownerInitials(owner)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="space-y-0.5">
              <Link
                href={`/users/${owner.handle}?tab=lists`}
                className="text-sm font-semibold text-foreground hover:underline"
              >
                {owner.nickname?.trim() || `@${owner.handle}`}
              </Link>
              <p className="text-xs text-muted-foreground">
                {list.created_at ? `생성 ${formatDate(list.created_at)}` : "생성일 정보 없음"}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-end gap-4">
            {isOwner ? (
              <div className="flex flex-col items-center text-xs text-muted-foreground">
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10"
                >
                  <Link href={`/lists/${list.id}/edit`} aria-label="리스트 편집">
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <span>수정</span>
              </div>
            ) : null}
            <ListSaveToggle variant="indicator" />
          </div>
        </div>

        <div className="mb-6 flex w-full flex-wrap items-center gap-6 text-sm text-muted-foreground sm:gap-8">
          <span className={META_ITEM_CLASS}>
            <BookOpen className="h-4 w-4" aria-hidden />
            {`${bookCount.toLocaleString()}권 포함`}
          </span>
          <span className="text-border text-xs mx-1 sm:mx-2">|</span>
          <ListVisibilityBadge isPublic={isPublic} />
          <span className="text-border text-xs mx-1 sm:mx-2">|</span>
          <ListShareButton title={list.title} variant="inline" className={META_ITEM_CLASS} />
        </div>
      </header>

      <div className="my-6 h-px w-full bg-border/70" />

      {bookCount === 0 ? (
        <EmptyListBooksState isOwner={isOwner} />
      ) : (
        <ListBooksList listId={list.id} books={books} isOwner={isOwner} />
      )}

      <div className="mt-4 px-0 sm:px-0">
        <ListSaveToggle variant="cta" />
      </div>
    </section>
  </ListSaveProvider>
  );
}

function ListVisibilityBadge({ isPublic }: { isPublic: boolean }) {
  const Icon = isPublic ? Unlock : Lock;
  return (
    <span className={META_ITEM_CLASS}>
      <Icon className="h-4 w-4" aria-hidden />
      {isPublic ? "공개" : "비공개"}
    </span>
  );
}

function EmptyListBooksState({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
      {isOwner ? (
        <>
          <p className="text-base font-semibold text-foreground">아직 책이 없어요.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            검색에서 책을 찾아 리스트에 추가해 보세요.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            책 찾으러 가기
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">아직 책이 담기지 않은 리스트예요.</p>
      )}
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function ownerInitials(owner: OwnerProfileRow) {
  const source = owner.nickname?.trim() || owner.handle.trim() || "U";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "U";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}
