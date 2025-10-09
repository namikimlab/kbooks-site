import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

type Props = { searchParams: { q?: string; mode?: string } };

export default async function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? "").trim();
  const mode = searchParams.mode ?? "real"; // default is real search

  let data, error;

  if (mode === "smoke") {
    // 🔥 Smoke test: just grab first 5 rows, no filters
    const res = await supabase
      .from("books_sample_public")
      .select("id, title, author")
      .limit(5);
    data = res.data;
    error = res.error;
  } else {
    // ✅ Real search
    const res = await supabase
      .from("books_sample_public")
      .select("id, title, author, publisher, cover_url")
      .or(`title.ilike.%${q}%,author.ilike.%${q}%`)
      .limit(30);
    data = res.data;
    error = res.error;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-semibold">검색 실패</h1>
        <pre className="mt-4 text-red-500">{error.message}</pre>
      </main>
    );
  }

  // Smoke mode → just dump JSON for debug
  if (mode === "smoke") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-semibold">Smoke test</h1>
        <pre className="mt-4 text-sm bg-muted p-4 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </main>
    );
  }

  // Real search results
  const results = data ?? [];
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
            <li key={b.id}>
              <Card className="overflow-hidden hover:shadow-sm transition">
                <Link href={`/books/${b.id}`}>
                  <CardContent className="p-3">
                    <div className="relative w-full aspect-[2/3] rounded-md bg-muted overflow-hidden">
                      {b.cover_url ? (
                        <Image
                          src={b.cover_url}
                          alt={b.title || "Unknown"}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <div className="font-medium line-clamp-2">
                        {b.title || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {b.author || "Unknown author"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {(b.publisher || "Unknown publisher")}
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
