import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { kakaoSearch } from "@/lib/kakaoSearch";

type Props = { searchParams: { q?: string } };

type Book = {
  isbn13: string;
  title: string | null;
  authors?: string[] | null;
  publisher?: string | null;
  thumbnail?: string | null;
  datetime?: string | null;
};

export default async function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? "").trim();
  if (!q) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-semibold">검색어를 입력하세요</h1>
      </main>
    );
  }

  const { documents } = await kakaoSearch(q);
  const results: Book[] = documents ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold">검색 결과</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        쿼리: “{q}” · {results.length}건
      </p>

      {results.length === 0 ? (
        <div className="mt-6 text-sm text-muted-foreground">일치하는 책이 없습니다.</div>
      ) : (
        <ul className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
          {results.map((b) => {
            const year = b.datetime ? new Date(b.datetime).getFullYear() : null;

            return (
              <li key={b.isbn13}>
                <Card className="overflow-hidden transition hover:shadow-sm">
                  <Link href={`/books/${b.isbn13}`}>
                    <CardContent className="p-3">
                      {/* Cover */}
                      <div className="flex justify-center">
                        {b.thumbnail ? (
                          <Image
                            src={b.thumbnail}
                            alt={b.title ?? "책 표지"}
                            width={120}
                            height={174}
                            sizes="120px"
                            className="rounded-md object-cover bg-muted"
                            decoding="async"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-[120px] h-[174px] rounded-md bg-muted" />
                        )}
                      </div>

                      {/* Text */}
                      <div className="mt-3">
                        {/* Full title */}
                        <div className="font-medium text-sm md:text-base leading-relaxed break-words line-clamp-3">
                          {b.title ?? "Unknown"}
                        </div>

                        {/* Author */}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {b.authors?.join(", ") ?? "Unknown author"}
                        </div>

                        {/* Publisher + Year */}
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
      )}
    </main>
  );
}
