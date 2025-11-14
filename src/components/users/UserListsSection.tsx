import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";

export type UserListSummary = {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  coverIsbn13: string | null;
  bookCount: number;
  createdAt: string | null;
};

type UserListsSectionProps = {
  lists: UserListSummary[];
  isOwner: boolean;
  profileNickname: string;
  emptyState?: ReactNode;
  showPrivateLock?: boolean;
};

export function UserListsSection({
  lists,
  isOwner,
  profileNickname,
  emptyState,
  showPrivateLock = false,
}: UserListsSectionProps) {
  if (lists.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>;
    }
    return <EmptyListsState isOwner={isOwner} profileNickname={profileNickname} />;
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border/70 bg-background/80">
      {lists.map(list => (
        <li key={list.id}>
          <div className="flex items-center gap-3 px-4 py-3">
            <Link
              href={`/lists/${list.id}`}
              className="flex flex-1 items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {list.coverIsbn13 ? (
                  <Image
                    src={`/api/thumbs/${list.coverIsbn13}?v=inline`}
                    alt={`${list.title} 대표 표지`}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                    표지 없음
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold leading-snug text-foreground sm:text-base line-clamp-2 break-words">
                  {showPrivateLock && !list.isPublic ? (
                    <>
                      <span
                        aria-label="비공개 리스트"
                        title="비공개 리스트"
                        className="mr-1 text-muted-foreground"
                      >
                        🔒
                      </span>
                      {list.title}
                    </>
                  ) : (
                    list.title
                  )}
                </span>
                <span className="text-xs text-muted-foreground sm:text-sm">
                  {list.bookCount.toLocaleString()}권
                  {list.createdAt ? ` · ${formatDateLabel(list.createdAt)}` : ""}
                </span>
              </div>
            </Link>
            {isOwner ? (
              <Link
                href={`/lists/${list.id}/edit`}
                aria-label="리스트 편집"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyListsState({ isOwner, profileNickname }: { isOwner: boolean; profileNickname: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
      {isOwner ? (
        <>
          <p className="text-base font-semibold text-foreground">아직 만든 리스트가 없어요.</p>
          <p className="mt-2">읽고 싶은 책이나 추천 모음을 리스트로 만들어 보세요.</p>
        </>
      ) : (
        <p>{profileNickname}님이 아직 공개한 리스트가 없어요.</p>
      )}
    </div>
  );
}

function formatDateLabel(iso: string) {
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
