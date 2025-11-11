// app/books/[id]/page.tsx
import CoverImage from "@/components/CoverImage";
import BookActionButtons from "@/components/BookActionButtons";
import BookDescription from "@/components/BookDescription";
import {
  BookRow,
  ensureBookStub,
  getBookByIsbn13,
  needsKakaoEnrichment,
  shouldFetchKyoboCategory,
} from "@/lib/books";
import { normalizeToIsbn13 } from "@/lib/isbn";
import { getSiteBaseUrl } from "@/lib/env";
import { headers } from "next/headers";

export const revalidate = 3600; // ISR 1h

type DisplayBook = {
  title: string | null;
  authors: string[];
  publisher: string | null;
  publishYear: number | null;
  description: string | null;
  category: string[] | null;
  kyoboUrl: string | null;
};

function authorsToList(author: string | null) {
  if (!author) return [];
  return author
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);
}

function toDisplay(book: BookRow | null): DisplayBook {
  const publishYear =
    book?.publish_date && !Number.isNaN(Date.parse(book.publish_date))
      ? new Date(book.publish_date).getFullYear()
      : null;

  return {
    title: book?.title ?? null,
    authors: authorsToList(book?.author ?? null),
    publisher: book?.publisher ?? null,
    publishYear,
    description: book?.description ?? null,
    category: book?.category ?? null,
    kyoboUrl: book?.kyobo_url ?? null,
  };
}

async function resolveBaseUrl() {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // headers() can throw during static generation; fall through to env fallback
  }
  return getSiteBaseUrl();
}

function triggerKyoboCategoryFetch(baseUrl: string, isbn13: string) {
  void fetch(`${baseUrl}/api/fetch-kyobo-category?isbn=${encodeURIComponent(isbn13)}`, {
    cache: "no-store",
  }).catch(err => {
    console.error(`[book-detail] kyobo trigger failed for ${isbn13}:`, err);
  });
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const normalizedIsbn = normalizeToIsbn13(id);

  if (!normalizedIsbn) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 aspect-[2/3] w-40 rounded-xl bg-muted" />
        <div className="text-base font-medium text-foreground">유효한 ISBN이 아니에요</div>
        <div className="mt-2 text-sm text-muted-foreground">
          요청한 값: <span className="font-mono text-foreground break-all">{id}</span>
        </div>
      </section>
    );
  }

  const isbn13 = normalizedIsbn;

  const baseUrl = await resolveBaseUrl();

  let book: BookRow | null = null;
  try {
    book = await getBookByIsbn13(isbn13);
  } catch (err) {
    console.error(`[book-detail] supabase read failed for ${isbn13}:`, err);
  }

  if (!book) {
    try {
      book = await ensureBookStub(isbn13);
    } catch (err) {
      console.error(`[book-detail] supabase stub insert failed for ${isbn13}:`, err);
    }
  }

  if (!book) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 aspect-[2/3] w-40 rounded-xl bg-muted" />
        <div className="text-base font-medium text-foreground">책 정보를 불러오지 못했어요</div>
        <div className="mt-2 text-sm text-muted-foreground">
          잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의해주세요.
        </div>
      </section>
    );
  }

  if (needsKakaoEnrichment(book)) {
    try {
      const kakaoRes = await fetch(
        `${baseUrl}/api/fetch-kakao?isbn=${encodeURIComponent(isbn13)}`,
        { cache: "no-store" }
      );
      if (kakaoRes.ok) {
        const payload = await kakaoRes.json();
        if (payload?.book) {
          book = payload.book as BookRow;
        } else {
          book = await getBookByIsbn13(isbn13);
        }
      } else {
        console.error(`[book-detail] kakao fetch failed: ${kakaoRes.status}`);
      }
    } catch (err) {
      console.error(`[book-detail] kakao fetch error for ${isbn13}:`, err);
    }
  }

  if (shouldFetchKyoboCategory(book)) {
    triggerKyoboCategoryFetch(baseUrl, isbn13);
  }

  const display = toDisplay(book);
  const kyoboUnavailable = !!book.kyobo_fetched_at && !book.kyobo_url;
  const hasPrimaryData =
    !!display.title ||
    display.authors.length > 0 ||
    !!display.publisher ||
    !!(display.description && display.description.trim().length > 0);

  if (!hasPrimaryData) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 aspect-[2/3] w-40 rounded-xl bg-muted" />
        <div className="text-base font-medium text-foreground">책 정보를 찾을 수 없어요</div>
        <div className="mt-2 text-sm text-muted-foreground">
          요청한 ISBN: <span className="font-mono text-foreground">{isbn13}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4">
      <section className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="flex justify-center md:block">
          <div className="w-full max-w-[360px]">
            <CoverImage isbn13={isbn13} alt={display.title ?? "책 표지"} />
          </div>
        </div>

        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h1 className="text-2xl md:text-3xl font-semibold leading-snug tracking-tight line-clamp-3 break-words">
            {display.title ?? "제목 정보 없음"}
          </h1>
          <div className="mt-2 text-base text-muted-foreground leading-snug">
            {display.authors.length ? display.authors.join(", ") : "저자 정보 없음"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground leading-snug">
            {(display.publisher ?? "출판사 정보 없음")}
            {display.publishYear ? ` · ${display.publishYear}` : ""}
          </div>
          <BookActionButtons isbn13={isbn13} kyoboUrl={display.kyoboUrl} />
          {kyoboUnavailable ? (
            <p className="mt-4 text-sm leading-relaxed text-foreground/90 max-w-prose">
              판매 정보가 없어요.
            </p>
          ) : display.description?.trim() ? (
            <BookDescription text={display.description} />
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-foreground/90 max-w-prose">
              소개 정보가 아직 없습니다.
            </p>
          )}

          {!kyoboUnavailable &&
            (display.category && display.category.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {display.category.map(cat => (
                  <span
                    key={cat}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-6 text-sm text-muted-foreground">
                🚧 태그 수집 중이에요.
              </div>
            ))}
        </div>
      </section>
    </section>
  );
}
