import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export default async function RecentBooksSection() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_KEY as string
  );

  const { data: books, error } = await supabase
    .from("recent_publish_books")
    .select(
      "isbn13, title, author_display, publish_date, publisher_name, cover_url"
    );

  const safeBooks = !error && books ? books : [];

  const placeholderCover =
    "https://nthahtfalfrrzesxlzhy.supabase.co/storage/v1/object/public/covers_sample/book2.jpg";

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">최근 나온 책</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            따끈따끈한 신작이에요
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <ul className="flex gap-4 px-4 sm:px-0">
          {safeBooks.length === 0
            ? [...Array(10)].map((_, i) => (
                <li key={i} className="w-36 flex-shrink-0">
                  <Card className="border-none shadow-none bg-transparent">
                    <CardContent className="p-0">
                      <div className="relative aspect-[2/3] w-full rounded-xl bg-muted animate-pulse" />
                      <div className="mt-2 h-4 w-28 rounded bg-muted animate-pulse" />
                      <div className="mt-1 h-3 w-20 rounded bg-muted animate-pulse" />
                    </CardContent>
                  </Card>
                </li>
              ))
            : safeBooks.map((book) => (
                <li key={book.isbn13} className="w-36 flex-shrink-0">
                  <Link
                    href={`/books/${book.isbn13}`}
                    className="block"
                    prefetch={false}
                  >
                    <Card className="border-none shadow-none bg-transparent">
                      {/* remove default padding from CardContent */}
                      <CardContent className="p-0">
                        {/* cover */}
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted">
                          <Image
                            src={book.cover_url || placeholderCover}
                            alt={book.title ?? "Book cover"}
                            fill
                            className="object-cover"
                            sizes="144px"
                            priority
                          />
                        </div>

                        {/* text block with tight spacing */}
                        <div className="mt-2">
                          <div className="text-sm font-semibold leading-snug line-clamp-2">
                            {book.title || "제목 없음"}
                          </div>

                          <div className="mt-1 text-[15px] text-muted-foreground leading-snug line-clamp-1">
                            {book.author_display || "저자 정보 없음"}
                          </div>

                          {book.publisher_name && (
                            <div className="text-[15px] text-muted-foreground leading-snug line-clamp-1">
                              {book.publisher_name}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
}
