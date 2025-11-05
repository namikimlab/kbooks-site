// app/search/page.tsx
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { kakaoSearch } from "@/lib/kakaoSearch";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

type Book = {
  isbn13: string;
  title: string | null;
  authors?: string[] | null;
  publisher?: string | null;
  thumbnail?: string | null;
  datetime?: string | null;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;
  const query = q.trim();
  const currentPage = Math.max(1, Number(page));
  const pageSize = 30;

  if (!query) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-semibold">검색어를 입력하세요</h1>
      </section>
    );
  }

  // ✅ Kakao API with pagination (no Supabase)
  const { documents = [], meta } = await kakaoSearch(query, currentPage, pageSize);
  const totalCount = meta?.pageable_count ?? documents.length;
  const isEnd = meta?.is_end ?? true;
  const totalPages = Math.min(50, Math.ceil(totalCount / pageSize)); // Kakao limit

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold">검색 결과</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        쿼리: “{query}” · {totalCount}건
      </p>

      {documents.length === 0 ? (
        <div className="mt-6 text-sm text-muted-foreground">
          일치하는 책이 없습니다.
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
            {documents.map((b: Book, index: number) => {
              const year = b.datetime ? new Date(b.datetime).getFullYear() : null;
              const isAboveFoldCandidate = index < 4; // Preload images likely visible on initial viewport
              return (
                <li key={b.isbn13}>
                  <Card className="overflow-hidden transition hover:shadow-sm">
                    <Link href={`/books/${b.isbn13}`}>
                      <CardContent className="p-3">
                        {/* Book cover */}
                        <div className="flex justify-center">
                          {b.isbn13 ? (
                            <Image
                              src={`/api/thumbs/${b.isbn13}`}
                              alt={b.title ?? "책 표지"}
                              width={120}
                              height={174}
                              sizes="120px"
                              className="rounded-md object-cover bg-muted"
                              decoding="async"
                              priority={isAboveFoldCandidate}
                            />
                          ) : (
                            <div className="w-[120px] h-[174px] rounded-md bg-muted" />
                          )}
                        </div>

                        {/* Book info */}
                        <div className="mt-3">
                          <div className="font-medium text-sm md:text-base leading-relaxed break-words line-clamp-3">
                            {b.title ?? "Unknown"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {b.authors?.join(", ") ?? "Unknown author"}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {b.publisher ?? "Unknown publisher"}
                            {year ? ` · ${year}` : ""}
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>

          {/* ✅ Pagination controls */}
          <div className="flex justify-center items-center gap-3 mt-8 text-sm">
            {currentPage > 1 && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&page=${currentPage - 1}`}
                className="px-3 py-1 border rounded hover:bg-muted transition-colors"
              >
                이전
              </Link>
            )}
            <span className="text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            {!isEnd && currentPage < totalPages && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&page=${currentPage + 1}`}
                className="px-3 py-1 border rounded hover:bg-muted transition-colors"
              >
                다음
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  );
}
