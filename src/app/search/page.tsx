// app/search/page.tsx
type Props = { searchParams: { q?: string } };

export default function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? "").trim();

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-xl font-semibold">검색 결과</h1>
      {!q ? (
        <p className="mt-2 text-sm text-muted-foreground">
          상단 검색창에 책 제목이나 저자를 입력하세요.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            쿼리: “{q}”
          </p>

          {/* Design placeholder for result grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="aspect-[2/3] rounded-md bg-muted" />
                <div className="mt-3 h-4 w-2/3 bg-muted rounded" />
                <div className="mt-2 h-3 w-1/2 bg-muted rounded" />
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
