import Link from "next/link";
import { notFound } from "next/navigation";

import { UserLikesSection, type UserLikeSummary } from "@/components/users/UserLikesSection";
import { UserListsSection, type UserListSummary } from "@/components/users/UserListsSection";
import { UserReadsSection, type UserReadSummary } from "@/components/users/UserReadsSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BookRow } from "@/lib/books";
import { createSupabaseServerClient } from "@/lib/supabaseServerClients";

export const dynamic = "force-dynamic";

type UserProfile = {
  id: string;
  handle: string;
  nickname: string;
  bio: string | null;
  avatar_url: string | null;
  link_url: string | null;
};

type ProfileSearchParams = {
  tab?: string;
  likesPage?: string;
  likesView?: string;
  readsPage?: string;
  readsView?: string;
};

const LIKE_PAGE_SIZE = 12;
const READ_PAGE_SIZE = 12;

type BookLikeRow = {
  isbn13: string;
  liked_at: string | null;
};

type BookReadRow = {
  isbn13: string;
  read_at: string | null;
  is_private: boolean | null;
};

type UserListRow = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean | null;
  updated_at: string | null;
  created_at: string | null;
};

type UserListBookRow = {
  list_id: string;
  isbn13: string | null;
  added_at: string | null;
};

function initialsFromProfile(profile: UserProfile) {
  const source = profile.nickname?.trim() || profile.handle.trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "U";
  }
  if (words.length === 1) {
    return words[0]!.slice(0, 2).toUpperCase();
  }
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<ProfileSearchParams>;
}) {
  const [{ handle }, search = {}] = await Promise.all([params, searchParams]);

  if (!handle) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: profile, error: profileError }, userResult] = await Promise.all([
    supabase
      .from("user_profile")
      .select("id, handle, nickname, bio, avatar_url, link_url")
      .eq("handle", handle)
      .maybeSingle<UserProfile>(),
    supabase.auth.getUser(),
  ]);

  if (profileError) {
    console.error(`[user-profile] failed to fetch profile for handle=${handle}`, profileError);
  }

  if (!profile) {
    notFound();
  }

  const tabCandidate = search?.tab;
  const activeTab =
    tabCandidate === "likes" || tabCandidate === "lists" || tabCandidate === "reads"
      ? tabCandidate
      : "activity";
  const requestedLikesView = search?.likesView === "cover" ? "cover" : "list";
  const requestedLikesPage = Number(search?.likesPage);
  const likesPage = Number.isFinite(requestedLikesPage) && requestedLikesPage > 0
    ? Math.floor(requestedLikesPage)
    : 1;
  const requestedReadsView = search?.readsView === "cover" ? "cover" : "list";
  const requestedReadsPage = Number(search?.readsPage);
  const readsPage = Number.isFinite(requestedReadsPage) && requestedReadsPage > 0
    ? Math.floor(requestedReadsPage)
    : 1;

  const isOwner = userResult.data.user?.id === profile.id;
  const initials = initialsFromProfile(profile);
  const bio = profile.bio?.trim();

  const normalizedSearchParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(search ?? {})) {
    if (typeof value === "string") {
      normalizedSearchParams[key] = value;
    }
  }

  const {
    likedBooks,
    likesTotal,
    likesPageForDisplay,
  } = await fetchUserLikes({
    supabase,
    userId: profile.id,
    page: likesPage,
  });

  const {
    readBooks,
    readsTotal,
    readsPageForDisplay,
  } = await fetchUserReads({
    supabase,
    userId: profile.id,
    page: readsPage,
    includePrivate: isOwner,
  });

  const userLists = await fetchUserLists({
    supabase,
    userId: profile.id,
    includePrivate: isOwner,
  });

  const likesSearchParams = {
    ...normalizedSearchParams,
    tab: "likes",
    likesView: requestedLikesView,
    likesPage: String(likesPageForDisplay),
  };

  const readsSearchParams = {
    ...normalizedSearchParams,
    tab: "reads",
    readsView: requestedReadsView,
    readsPage: String(readsPageForDisplay),
  };

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center gap-4 text-center">
        <Avatar className="size-28">
          {profile.avatar_url ? (
            <AvatarImage
              src={profile.avatar_url}
              alt={`${profile.nickname} 아바타`}
              className="object-cover"
            />
          ) : (
            <AvatarFallback className="text-3xl font-semibold uppercase">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">{profile.nickname}</h1>
          {bio ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {bio}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">아직 소개가 없어요.</p>
          )}
          <div className="text-sm">
            {profile.link_url ? (
              <a
                href={profile.link_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {profile.link_url}
              </a>
            ) : (
              <span className="text-muted-foreground">링크가 아직 없어요.</span>
            )}
          </div>
        </div>
        {isOwner ? (
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/profile/edit">프로필 편집</Link>
            </Button>
            <form action="/logout" method="post">
              <Button type="submit" variant="outline">
                로그아웃
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="mt-12">
        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activity">나의 활동</TabsTrigger>
            <TabsTrigger value="likes">좋아요</TabsTrigger>
            <TabsTrigger value="reads">읽은 책</TabsTrigger>
            <TabsTrigger value="lists">리스트</TabsTrigger>
          </TabsList>
          <TabsContent value="activity">
            <div className="rounded-xl border border-border/70 bg-background/70 p-6 text-sm text-muted-foreground">
              활동 내역이 준비 중이에요. 곧 다양한 기록을 확인할 수 있어요.
            </div>
          </TabsContent>
          <TabsContent value="likes" id="likes">
            <UserLikesSection
              books={likedBooks}
              totalCount={likesTotal}
              pageSize={LIKE_PAGE_SIZE}
              currentPage={likesPageForDisplay}
              profileHandle={profile.handle}
              profileNickname={profile.nickname}
              initialSearchParams={likesSearchParams}
              defaultView={requestedLikesView}
              isOwner={isOwner}
            />
          </TabsContent>
          <TabsContent value="reads" id="reads">
            <UserReadsSection
              books={readBooks}
              totalCount={readsTotal}
              pageSize={READ_PAGE_SIZE}
              currentPage={readsPageForDisplay}
              profileHandle={profile.handle}
              profileNickname={profile.nickname}
              initialSearchParams={readsSearchParams}
              defaultView={requestedReadsView}
              isOwner={isOwner}
            />
          </TabsContent>
          <TabsContent value="lists">
            <div className="space-y-4">
              {isOwner && (
                <Button
                  asChild
                  className="w-full justify-center rounded-2xl py-4 text-base font-semibold"
                >
                  <Link href={`/lists/new?next=/users/${profile.handle}`}>리스트 만들기</Link>
                </Button>
              )}
              <UserListsSection
                lists={userLists}
                isOwner={isOwner}
                profileNickname={profile.nickname}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

async function fetchUserLikes({
  supabase,
  userId,
  page,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  page: number;
}): Promise<{
  likedBooks: UserLikeSummary[];
  likesTotal: number;
  likesPageForDisplay: number;
}> {
  const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  const [{ count: likesCount, error: likesCountError }, initialPageResult] = await Promise.all([
    supabase
      .from("book_likes")
      .select("isbn13", { count: "exact", head: true })
      .eq("user_id", userId),
    fetchLikesPage({ supabase, userId, page: normalizedPage }),
  ]);

  if (likesCountError) {
    console.error("[user-profile] failed to count likes", likesCountError);
  }

  let likesRows: BookLikeRow[] = initialPageResult.data ?? [];
  if (initialPageResult.error) {
    console.error("[user-profile] failed to fetch likes page", initialPageResult.error);
  }

  const likesTotal = typeof likesCount === "number" ? likesCount : likesRows.length;
  const totalPages =
    typeof likesCount === "number"
      ? Math.max(1, Math.ceil(Math.max(likesCount, 1) / LIKE_PAGE_SIZE))
      : Math.max(1, normalizedPage);

  let likesPageForDisplay = normalizedPage;

  if (likesTotal === 0) {
    likesPageForDisplay = 1;
  } else if (typeof likesCount === "number" && normalizedPage > totalPages) {
    likesPageForDisplay = totalPages;
    const fallbackResult = await fetchLikesPage({
      supabase,
      userId,
      page: likesPageForDisplay,
    });

    if (fallbackResult.error) {
      console.error("[user-profile] failed to fetch fallback likes page", fallbackResult.error);
    } else {
      likesRows = fallbackResult.data ?? [];
    }
  }

  const isbnList = likesRows.map(row => row.isbn13).filter(Boolean);
  let bookRows: Pick<BookRow, "isbn13" | "title" | "author">[] = [];

  if (isbnList.length > 0) {
    const { data, error } = await supabase
      .from("books")
      .select("isbn13, title, author")
      .in("isbn13", isbnList);

    if (error) {
      console.error("[user-profile] failed to fetch liked book metadata", error);
    } else if (data) {
      bookRows = data;
    }
  }

  const booksByIsbn = new Map(bookRows.map(book => [book.isbn13, book]));

  const likedBooks: UserLikeSummary[] = likesRows.map(row => {
    const book = booksByIsbn.get(row.isbn13);
    return {
      isbn13: row.isbn13,
      title: book?.title ?? null,
      author: book?.author ?? null,
      likedAt: row.liked_at ?? null,
    };
  });

  return {
    likedBooks,
    likesTotal,
    likesPageForDisplay,
  };
}

function fetchLikesPage({
  supabase,
  userId,
  page,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  page: number;
}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (safePage - 1) * LIKE_PAGE_SIZE;
  const to = from + LIKE_PAGE_SIZE - 1;

  return supabase
    .from("book_likes")
    .select<BookLikeRow>("isbn13, liked_at")
    .eq("user_id", userId)
    .order("liked_at", { ascending: false })
    .range(from, to);
}

async function fetchUserReads({
  supabase,
  userId,
  page,
  includePrivate,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  page: number;
  includePrivate: boolean;
}): Promise<{
  readBooks: UserReadSummary[];
  readsTotal: number;
  readsPageForDisplay: number;
}> {
  const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  const countQuery = supabase
    .from("user_reads")
    .select("isbn13", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!includePrivate) {
    countQuery.eq("is_private", false);
  }

  const [{ count: readsCount, error: readsCountError }, initialPageResult] = await Promise.all([
    countQuery,
    fetchReadsPage({ supabase, userId, page: normalizedPage, includePrivate }),
  ]);

  if (readsCountError) {
    console.error("[user-profile] failed to count reads", readsCountError);
  }

  let readRows: BookReadRow[] = initialPageResult.data ?? [];
  if (initialPageResult.error) {
    console.error("[user-profile] failed to fetch reads page", initialPageResult.error);
  }

  const readsTotal = typeof readsCount === "number" ? readsCount : readRows.length;
  const totalPages =
    typeof readsCount === "number"
      ? Math.max(1, Math.ceil(Math.max(readsCount, 1) / READ_PAGE_SIZE))
      : Math.max(1, normalizedPage);

  let readsPageForDisplay = normalizedPage;

  if (readsTotal === 0) {
    readsPageForDisplay = 1;
  } else if (typeof readsCount === "number" && normalizedPage > totalPages) {
    readsPageForDisplay = totalPages;
    const fallbackResult = await fetchReadsPage({
      supabase,
      userId,
      page: readsPageForDisplay,
      includePrivate,
    });

    if (fallbackResult.error) {
      console.error("[user-profile] failed to fetch fallback reads page", fallbackResult.error);
    } else {
      readRows = fallbackResult.data ?? [];
    }
  }

  const isbnList = readRows.map(row => row.isbn13).filter(Boolean);
  let bookRows: Pick<BookRow, "isbn13" | "title" | "author">[] = [];

  if (isbnList.length > 0) {
    const { data, error } = await supabase
      .from("books")
      .select("isbn13, title, author")
      .in("isbn13", isbnList);

    if (error) {
      console.error("[user-profile] failed to fetch read book metadata", error);
    } else if (data) {
      bookRows = data;
    }
  }

  const booksByIsbn = new Map(bookRows.map(book => [book.isbn13, book]));

  const readBooks: UserReadSummary[] = readRows.map(row => {
    const book = booksByIsbn.get(row.isbn13);
    return {
      isbn13: row.isbn13,
      title: book?.title ?? null,
      author: book?.author ?? null,
      readAt: row.read_at ?? null,
      isPrivate: Boolean(row.is_private),
    };
  });

  return {
    readBooks,
    readsTotal,
    readsPageForDisplay,
  };
}

function fetchReadsPage({
  supabase,
  userId,
  page,
  includePrivate,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  page: number;
  includePrivate: boolean;
}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (safePage - 1) * READ_PAGE_SIZE;
  const to = from + READ_PAGE_SIZE - 1;

  const query = supabase
    .from("user_reads")
    .select<BookReadRow>("isbn13, read_at, is_private")
    .eq("user_id", userId)
    .order("read_at", { ascending: false })
    .range(from, to);

  if (!includePrivate) {
    query.eq("is_private", false);
  }

  return query;
}

async function fetchUserLists({
  supabase,
  userId,
  includePrivate,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  includePrivate: boolean;
}): Promise<UserListSummary[]> {
  const listQuery = supabase
    .from("user_lists")
    .select<UserListRow>("id, title, description, is_public, updated_at, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!includePrivate) {
    listQuery.eq("is_public", true);
  }

  const { data: listRows, error: listError } = await listQuery;

  if (listError) {
    console.error("[user-profile] failed to fetch user lists", listError);
    return [];
  }

  const safeListRows = listRows ?? [];
  const listIds = safeListRows.map(list => list.id);

  let membershipRows: UserListBookRow[] = [];
  if (listIds.length > 0) {
    const { data: membershipData, error: membershipError } = await supabase
      .from("user_list_books")
      .select<UserListBookRow>("list_id, isbn13, added_at")
      .in("list_id", listIds)
      .order("added_at", { ascending: true });

    if (membershipError) {
      console.error("[user-profile] failed to fetch list book mappings", membershipError);
    } else if (membershipData) {
      membershipRows = membershipData;
    }
  }

  const coverMap = new Map<string, { firstIsbn: string | null; count: number }>();
  for (const row of membershipRows) {
    const existing = coverMap.get(row.list_id) ?? { firstIsbn: null, count: 0 };
    if (!existing.firstIsbn && row.isbn13) {
      existing.firstIsbn = row.isbn13;
    }
    existing.count += 1;
    coverMap.set(row.list_id, existing);
  }

  return safeListRows.map(row => {
    const cover = coverMap.get(row.id);
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      isPublic: Boolean(row.is_public),
      coverIsbn13: cover?.firstIsbn ?? null,
      bookCount: cover?.count ?? 0,
      createdAt: row.created_at ?? null,
    };
  });
}
