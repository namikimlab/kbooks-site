// app/search/page.tsx
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { kakaoSearch } from "@/lib/kakaoSearch";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Props = { searchParams: Promise<{ q?: string }> };

type Book = {
  isbn13: string;
  title: string | null;
  authors?: string[] | null;
  publisher?: string | null;
  thumbnail?: string | null; // kept but not used for src (we use /api/covers)
  datetime?: string | null;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams; // ✅ Next 15: await dynamic API
  const query = q.trim();

  const supabase = await createSupabaseServerClient();
  
  if (!query) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-semibold">검색어를 입력하세요</h1>
      </main>
    );
  }

  const { documents } = await kakaoSearch(query);
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
            // Safe year extraction
            let year: number | null = null;
            if (b?.datetime) {
              const t = Date.parse(b.datetime);
              if (!Number.isNaN(t)) year = new Date(t).getFullYear();
            }

            return (
              <li key={b.isbn13}>
                <Card className="overflow-hidden transition hover:shadow-sm">
                  <Link href={`/books/${b.isbn13}`}>
                    <CardContent className="p-3">
                      {/* Cover (cached via /api/covers -> Supabase) */}
                      <div className="flex justify-center">
                        {b.isbn13 ? (
                          <Image
                            src={`/api/covers/${b.isbn13}`}
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
                        {/* Title: clamp 3 lines always */}
                        <div className="font-medium text-sm md:text-base leading-relaxed break-words line-clamp-3">
                          {b.title ?? "Unknown"}
                        </div>

                        {/* Author */}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {b.authors?.join(", ") ?? "Unknown author"}
                        </div>

                        {/* Publisher · Year */}
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
