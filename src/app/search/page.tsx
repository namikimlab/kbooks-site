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
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((b) => (
            <li key={b.isbn13}>
              <Card className="overflow-hidden transition hover:shadow-sm">
                <Link href={`/books/${b.isbn13}`}>
                  <CardContent className="p-3">
                    <div className="relative w-full aspect-[2/3] overflow-hidden rounded-md bg-muted">
                      {b.thumbnail && (
                        <Image
                          src={b.thumbnail}
                          alt={b.title ?? "책 표지"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="line-clamp-2 font-medium">
                        {b.title ?? "Unknown"}
                      </div>
                      <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {b.authors?.join(", ") ?? "Unknown author"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {b.publisher ?? "Unknown publisher"}
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
