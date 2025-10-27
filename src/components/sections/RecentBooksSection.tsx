import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

export default async function RecentBooksSection() {
  // Initialize Supabase client with publishable key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_KEY as string
  );

  // Fetch data from the view
  const { data: books, error } = await supabase
    .from("recent_publish_books")
    .select(
      "isbn13, title, author_display, publish_date, publisher_name, cover_url"
    );



    // Basic inline debug
  const debugInfo = {
    gotError: !!error,
    errorMessage: error ? String(error.message || error) : null,
    rowCount: books ? books.length : 0,
  };

  // 3. Safe fallback
  // If Supabase errored OR no rows came back, just render skeletons
  const safeBooks = !error && books ? books : [];

  // Placeholder if cover_url is missing
  const placeholderCover =
    "https://nthahtfalfrrzesxlzhy.supabase.co/storage/v1/object/public/covers_sample/book2.jpg";

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">최근 나온 책</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            따끈 따끈한 신작이에요
          </p>
        </div>
      </div>

      {/* TEMP: show debug output so we can see what's happening */}
      <pre className="text-[10px] text-red-500">
        {JSON.stringify(debugInfo)}
      </pre>


      <div className="mt-6 overflow-x-auto">
        <ul className="flex gap-4">
          {safeBooks.length === 0 ? (
            // Empty skeleton while loading or if no data
            [...Array(10)].map((_, i) => (
              <li key={i} className="w-32 flex-shrink-0">
                <Card className="overflow-hidden">
                  <CardContent className="p-2">
                    <div className="relative aspect-[2/3] w-full rounded-md bg-muted animate-pulse" />
                    <div className="mt-2 h-3 w-24 rounded bg-muted animate-pulse" />
                    <div className="mt-1 h-3 w-16 rounded bg-muted animate-pulse" />
                  </CardContent>
                </Card>
              </li>
            ))
          ) : (
            safeBooks.map((book) => (
              <li key={book.isbn13} className="w-32 flex-shrink-0">
                <Card className="overflow-hidden">
                  <CardContent className="p-2">
                    <div className="relative aspect-[2/3] w-full rounded-md bg-muted">
                      <Image
                        src={book.cover_url || placeholderCover}
                        alt={book.title ?? "Book cover"}
                        fill
                        className="object-cover rounded-md"
                        sizes="128px"
                        priority
                      />
                    </div>

                    <div className="mt-2 text-xs font-medium line-clamp-2">
                      {book.title || "제목 없음"}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground line-clamp-1">
                      {book.author_display || "저자 정보 없음"}
                    </div>
                    {book.publisher_name && (
                      <div className="text-[10px] text-muted-foreground line-clamp-1">
                        {book.publisher_name}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
