import Link from "next/link";
import { notFound } from "next/navigation";

import { UserLikesSection, type UserLikeSummary } from "@/components/users/UserLikesSection";
import { UserListsSection, type UserListSummary } from "@/components/users/UserListsSection";
import { UserSavedListsSection } from "@/components/users/UserSavedListsSection";
import { UserActivitySection } from "@/components/users/UserActivitySection";
import { UserReadsSection, type UserReadSummary } from "@/components/users/UserReadsSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BookRow } from "@/lib/books";
import { createSupabaseServerClient } from "@/lib/supabaseServerClients";
import { cn } from "@/lib/utils";

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
  listsView?: string;
  profileUpdated?: string;
};

const LIKE_PAGE_SIZE = 30;
const READ_PAGE_SIZE = 30;

type BookLikeRow = {
  isbn13: string;
  liked_at: string | null;
};

type BookReadRow = {
  isbn13: string;
  read_at: string | null;
  is_private: boolean | null;
};

type UserListBookRow = {
  list_id: string;
  isbn13: string | null;
  added_at: string | null;
};

type UserListSaveRow = {
  list_id: string;
  saved_at: string | null;
};

type UserListRow = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean | null;
  created_at: string | null;
  updated_at: string | null;
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
    tabCandidate === "likes" ||
    tabCandidate === "reads" ||
    tabCandidate === "saved" ||
    tabCandidate === "lists"
      ? tabCandidate
      : "likes";
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
  const requestedListsView = search?.listsView === "saved" ? "saved" : "mine";

  const isOwner = userResult.data.user?.id === profile.id;
  const listsView = isOwner ? requestedListsView : "mine";
  const initials = initialsFromProfile(profile);
  const bio = profile.bio?.trim();

  const showProfileUpdatedToast = search?.profileUpdated === "1";
  const normalizedSearchParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(search ?? {})) {
    if (typeof value === "string") {
      normalizedSearchParams[key] = value;
    }
  }
  delete normalizedSearchParams.profileUpdated;

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

  const savedLists = isOwner
    ? await fetchSavedLists({
        supabase,
        userId: profile.id,
      })
    : [];

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
  const listsSearchParamsBase: Record<string, string> = {
    ...normalizedSearchParams,
    tab: "lists",
  };
  delete listsSearchParamsBase.listsView;
  const buildListsViewHref = (view: "mine" | "saved") => {
    const params = new URLSearchParams(listsSearchParamsBase);
    if (view === "mine") {
      params.delete("listsView");
    } else {
      params.set("listsView", view);
    }
    return `/users/${profile.handle}?${params.toString()}#lists`;
  };

  return (
    <>
      <section className="mx-auto py-4 max-w-3xl">
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
          <p className="text-sm font-medium text-muted-foreground">@{profile.handle}</p>
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

      <div className="mt-4 w-full">
        <UserActivitySection />
      </div>

      <div className="mt-4">
        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="likes">좋아요</TabsTrigger>
            <TabsTrigger value="reads">읽은 책</TabsTrigger>
            <TabsTrigger value="lists">리스트</TabsTrigger>
          </TabsList>
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
          <TabsContent value="lists" id="lists">
            {isOwner ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="inline-flex rounded-full bg-muted/50 p-1 text-xs font-semibold text-muted-foreground sm:text-sm">
                    {[
                      { label: "내가 만든 리스트", value: "mine" as const },
                      { label: "저장한 리스트", value: "saved" as const },
                    ].map(option => {
                      const active = listsView === option.value;
                      return (
                        <Link
                          key={option.value}
                          href={buildListsViewHref(option.value)}
                          scroll={false}
                          className={cn(
                            "rounded-full px-4 py-1.5 transition",
                            active
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {option.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
                {listsView === "mine" ? (
                  <div className="space-y-4">
                    <Button
                      asChild
                      className="w-full justify-center rounded-2xl py-4 text-base font-semibold"
                    >
                      <Link href={`/lists/new?next=/users/${profile.handle}`}>리스트 만들기</Link>
                    </Button>
                    <UserListsSection
                      lists={userLists}
                      isOwner
                      profileNickname={profile.nickname}
                      showPrivateLock
                    />
                  </div>
                ) : (
                  <UserSavedListsSection
                    lists={savedLists}
                    profileNickname={profile.nickname}
                  />
                )}
              </div>
            ) : (
              <UserListsSection
                lists={userLists}
                isOwner={false}
                profileNickname={profile.nickname}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
      </section>
      {showProfileUpdatedToast ? (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-50 shadow-lg shadow-emerald-500/40">
            프로필이 저장됐어요.
          </div>
        </div>
      ) : null}
    </>
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
      .from("book_like")
      .select("isbn13", { count: "exact", head: true })
      .eq("user_id", userId),
    fetchLikesPage({ supabase, userId, page: normalizedPage }),
  ]);

  if (likesCountError) {
    console.error("[user-profile] failed to count likes", likesCountError);
  }

  let likesRows: BookLikeRow[] = (initialPageResult.data as BookLikeRow[]) ?? [];
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
      likesRows = (fallbackResult.data as BookLikeRow[]) ?? [];
    }
  }

  const isbnList = likesRows.map(row => row.isbn13).filter(Boolean);
  let bookRows: Pick<BookRow, "isbn13" | "title" | "author">[] = [];

  if (isbnList.length > 0) {
    const { data, error } = await supabase
      .from("book")
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

async function fetchLikesPage({
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
    .from("book_like")
    .select("isbn13, liked_at")
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
    .from("user_read")
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

  let readRows: BookReadRow[] = (initialPageResult.data as BookReadRow[]) ?? [];
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
      readRows = (fallbackResult.data as BookReadRow[]) ?? [];
    }
  }

  const isbnList = readRows.map(row => row.isbn13).filter(Boolean);
  let bookRows: Pick<BookRow, "isbn13" | "title" | "author">[] = [];

  if (isbnList.length > 0) {
    const { data, error } = await supabase
      .from("book")
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
    .from("user_read")
    .select("isbn13, read_at, is_private")
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
    .from("user_list")
    .select("id, title, description, is_public, updated_at, created_at")
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

  const safeListRows = (listRows ?? []) as UserListRow[];
  if (safeListRows.length === 0) {
    return [];
  }

  const listIds = safeListRows.map(list => list.id);
  let membershipRows: UserListBookRow[] = [];
  if (listIds.length > 0) {
    const { data: membershipData, error: membershipError } = await supabase
      .from("user_list_book")
      .select("list_id, isbn13, added_at")
      .in("list_id", listIds)
      .order("added_at", { ascending: true });

    if (membershipError) {
      console.error("[user-profile] failed to fetch list book mappings", membershipError);
    } else if (membershipData) {
      membershipRows = membershipData;
    }
  }

  return summarizeLists(safeListRows, membershipRows);
}

async function fetchSavedLists({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}): Promise<UserListSummary[]> {
  const { data: saveRows, error: saveError } = await supabase
    .from("user_list_save")
    .select("list_id, saved_at")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  if (saveError) {
    console.error("[user-profile] failed to fetch saved lists", saveError);
    return [];
  }

  const savedRows = (saveRows ?? []) as UserListSaveRow[];
  const savedListIds = savedRows.map(row => row.list_id);

  if (savedListIds.length === 0) {
    return [];
  }

  const { data: listRows, error: listError } = await supabase
    .from("user_list")
    .select("id, title, description, is_public, updated_at, created_at")
    .in("id", savedListIds)
    .eq("is_public", true);

  if (listError) {
    console.error("[user-profile] failed to fetch saved list metadata", listError);
    return [];
  }

  const safeListRows = (listRows ?? []).filter(row => row.is_public) as UserListRow[];
  if (safeListRows.length === 0) {
    return [];
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from("user_list_book")
    .select("list_id, isbn13, added_at")
    .in("list_id", safeListRows.map(row => row.id))
    .order("added_at", { ascending: true });

  let membershipRows: UserListBookRow[] = [];
  if (membershipError) {
    console.error("[user-profile] failed to fetch saved list book mappings", membershipError);
  } else if (membershipData) {
    membershipRows = membershipData;
  }

  const summaries = summarizeLists(safeListRows, membershipRows);
  const orderMap = new Map(savedListIds.map((listId, index) => [listId, index]));

  return summaries.sort((a, b) => {
    const aIndex = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

function summarizeLists(
  listRows: UserListRow[],
  membershipRows: UserListBookRow[]
): UserListSummary[] {
  const coverMap = new Map<string, { firstIsbn: string | null; count: number }>();
  for (const row of membershipRows) {
    const existing = coverMap.get(row.list_id) ?? { firstIsbn: null, count: 0 };
    if (!existing.firstIsbn && row.isbn13) {
      existing.firstIsbn = row.isbn13;
    }
    existing.count += 1;
    coverMap.set(row.list_id, existing);
  }

  return listRows.map(row => {
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
