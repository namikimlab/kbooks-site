import Link from "next/link";
import { notFound } from "next/navigation";

import { ListBooksList } from "@/components/lists/ListBooksList";
import { ListCoverCollage } from "@/components/lists/ListCoverCollage";
import { ListShareButton } from "@/components/lists/ListShareButton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BookRow } from "@/lib/books";
import { createSupabaseServerClient } from "@/lib/supabaseServerClients";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

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
      .from("user_lists")
      .select<ListRow>("id, title, description, is_public, updated_at, created_at, user_id")
      .eq("id", id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (listError) {
    console.error(`[list-detail] failed to fetch user_list id=${id}`, listError);
  }

  if (!list) {
    notFound();
  }

  const isOwner = authResult.data.user?.id === list.user_id;
  const isPublic = Boolean(list.is_public);

  if (!isOwner && !isPublic) {
    notFound();
  }

  const [
    { data: ownerProfile, error: ownerError },
    { data: membershipRows, error: membershipError },
  ] = await Promise.all([
    supabase
      .from("user_profile")
      .select("id, handle, nickname, avatar_url")
      .eq("id", list.user_id)
      .maybeSingle<OwnerProfileRow>(),
    supabase
      .from("user_list_books")
      .select("isbn13, position")
      .eq("list_id", list.id)
      .order("position", { ascending: true, nullsFirst: false })
      .order("isbn13", { ascending: true }),
  ]);

  if (ownerError) {
    console.error(`[list-detail] failed to fetch owner profile user_id=${list.user_id}`, ownerError);
  }

  if (membershipError) {
    console.error(`[list-detail] failed to fetch books for list id=${list.id}`, membershipError);
  }

  const owner: OwnerProfileRow = ownerProfile ?? {
    id: list.user_id,
    handle: "unknown",
    nickname: "사용자",
    avatar_url: null,
  };

  const orderedRows = (membershipRows ?? []).filter(
    (row): row is { isbn13: string; position: number | null } => Boolean(row.isbn13)
  );
  const isbnList = orderedRows.map(row => row.isbn13);

  let booksLookup = new Map<string, BasicBookRow>();
  if (isbnList.length > 0) {
    const { data: bookRows, error: booksError } = await supabase
      .from("books")
      .select<BasicBookRow>("isbn13, title, author")
      .in("isbn13", isbnList);

    if (booksError) {
      console.error(`[list-detail] failed to fetch book metadata for list id=${list.id}`, booksError);
    } else if (bookRows) {
      booksLookup = new Map(bookRows.map(row => [row.isbn13, row]));
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
    <section className="mx-auto max-w-6xl">
      <header className="space-y-4">
        <ListCoverCollage isbnList={books.map(book => book.isbn13)} />
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {list.title}
          </h1>
          {list.description ? (
            <p className="max-w-3xl whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {list.description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={owner.avatar_url ?? undefined} alt={`${owner.handle} 아바타`} />
              <AvatarFallback>{ownerInitials(owner)}</AvatarFallback>
            </Avatar>
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
          <div className="flex flex-shrink-0 items-center gap-2">
            {isOwner ? (
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="rounded-full border border-transparent hover:border-border"
              >
                <Link href={`/lists/${list.id}/edit`} aria-label="리스트 편집">
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <ListShareButton title={list.title} />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{bookCount.toLocaleString()}권 포함</span>
          <span className="text-xs text-border">●</span>
          <ListVisibilityBadge isPublic={isPublic} />
        </div>
      </header>

      <div className="my-8 h-px w-full bg-border/70" />

      {bookCount === 0 ? (
        <EmptyListBooksState isOwner={isOwner} />
      ) : (
        <ListBooksList listId={list.id} books={books} isOwner={isOwner} />
      )}
    </section>
  );
}

function ListVisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        isPublic
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700"
      )}
    >
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
