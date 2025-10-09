// app/books/[id]/page.tsx
import Image from "next/image";

export default function BookDetailSkeleton() {
  // Placeholder data structure; replace later
  const book = {
    title: "Book Title",
    authors: ["Author One", "Author Two"],
    publisher: "Publisher Name",
    year: "2024",
    coverUrl: "/placeholder-cover.jpg", // replace with Supabase URL later
    description:
      "Short description goes here. Keep it to a few sentences for preview.",
    isbn13: "9780000000000",
    language: "Korean",
    pages: 352,
    tags: ["Fiction", "Awarded"],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-[420px,1fr] md:gap-10">
        {/* Cover */}
        <figure className="relative">
          <div className="relative w-full overflow-hidden rounded-xl bg-muted aspect-[2/3]">
            <Image
              src={book.coverUrl}
              alt={book.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 420px"
            />
          </div>
        </figure>

        {/* Meta */}
        <div className="flex flex-col">
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            {book.title}
          </h1>
          <div className="mt-2 text-base text-muted-foreground">
            {book.authors?.length ? book.authors.join(", ") : "Unknown author"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {book.publisher || "Unknown publisher"} · {book.year || "Unknown year"}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-3">
            <button
              className="rounded-full border px-3 py-1.5 text-sm"
              aria-pressed="false"
              aria-label="Like this book"
            >
              ♥ Like
            </button>
            <button className="rounded-full border px-3 py-1.5 text-sm" aria-label="Share this book">
              ↗ Share
            </button>
            <button className="rounded-full border px-3 py-1.5 text-sm" aria-label="Save this book">
              ✚ Save
            </button>
          </div>

          {/* Description */}
          <section className="mt-6 md:mt-8">
            <h2 className="text-sm font-medium text-muted-foreground">Description</h2>
            <p className="mt-2 leading-7">{book.description || "No description available."}</p>
          </section>

          {/* Facts */}
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="text-sm">
              <div className="text-muted-foreground">ISBN-13</div>
              <div className="font-medium">{book.isbn13 || "Unknown"}</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Language</div>
              <div className="font-medium">{book.language || "Unknown"}</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Pages</div>
              <div className="font-medium">{book.pages || "Unknown"}</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Publisher</div>
              <div className="font-medium">{book.publisher || "Unknown"}</div>
            </div>
          </section>

          {/* Tags */}
          {!!book.tags?.length && (
            <section className="mt-6">
              <div className="flex flex-wrap gap-2">
                {book.tags.map((t) => (
                  <span key={t} className="rounded-full border px-2.5 py-1 text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      {/* Similar Books (placeholder) */}
      <section className="mt-10">
        <h2 className="text-lg font-medium">Similar books</h2>
        <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    </main>
  );
}
