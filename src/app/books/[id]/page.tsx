// app/books/[id]/page.tsx
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

export default async function BookDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Create Supabase client using public anon key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_KEY as string
  );

  // Fetch the book from kbooks_dbt.silver_books by isbn13
  const { data: book, error } = await supabase
    .from("book_public")
    .select(
      `
      isbn13,
      title,
      cover_url,
      author_display,
      publisher_name,
      publish_date,
      publish_predate,
      book_introduction
      `
    )
    .eq("isbn13", params.id)
    .maybeSingle();

  const placeholderCover =
    "https://nthahtfalfrrzesxlzhy.supabase.co/storage/v1/object/public/covers_sample/book2.jpg";

  // If we couldn't load the book, show fallback page
  if (!book || error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 aspect-[2/3] w-40 rounded-xl bg-muted" />
        <div className="text-base font-medium text-foreground">
          책 정보를 찾을 수 없어요
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          요청한 ISBN:{" "}
          <span className="font-mono text-foreground">{params.id}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Mobile: 1 col. Desktop: 2 cols. */}
      <section className="grid gap-6 md:grid-cols-2 md:gap-10">
        {/* LEFT: cover */}
        <div className="flex justify-center md:block">
          <div className="w-full max-w-[320px]">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted shadow-sm">
              <Image
                src={book.cover_url || placeholderCover}
                alt={book.title || "Book cover"}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 320px"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: title + meta */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-semibold leading-snug tracking-tight">
            {book.title || "제목 정보 없음"}
          </h1>

          {/* Author */}
          <div className="mt-2 text-base text-muted-foreground leading-snug">
            {book.author_display || "저자 정보 없음"}
          </div>

          {/* Publisher · Year */}
          <div className="mt-1 text-sm text-muted-foreground leading-snug">
            {(book.publisher_name || "출판사 정보 없음") +
              " · " +
              (book.publish_date || "출판일 정보 없음")}
          </div>

          {/* Intro */}
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-foreground/90 max-w-prose">
            {book.book_introduction && book.book_introduction.trim().length > 0
              ? book.book_introduction
              : "소개 정보가 아직 없습니다."}
          </p>
        </div>
      </section>
    </main>
  );
}
