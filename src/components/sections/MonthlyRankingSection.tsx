import Link from "next/link";
import { supabase } from "@/lib/supabase";

type TopBooksMonthlyRow = {
  month_start: string;  // 'YYYY-MM-01'
  isbn13: string;
  likes_total: number | null;
  rank: number | null;
  title: string | null;
  author: string | null;
  publisher: string | null;
};

// KST month start as 'YYYY-MM-01'
function getKSTMonthStart(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  // Always first day of the current KST month
  return `${parts.year}-${parts.month}-01`;
}

function normalizeRow(row: TopBooksMonthlyRow, idx: number) {
  return {
    // Use isbn13 as stable key
    id: row.isbn13,
    title: row.title ?? "제목 미상",
    author: row.author ?? "작자 미상",
    // fallback rank: order index (1-based)
    rank: row.rank ?? idx + 1,
  };
}

export default async function MonthlyRankingSection() {
  const monthStart = getKSTMonthStart();

  const { data, error } = await supabase
    .from("top_books_monthly")
    .select("month_start,isbn13,likes_total,rank,title,author,publisher")
    .eq("month_start", monthStart)
    .order("rank", { ascending: true })
    .limit(5)
    .returns<TopBooksMonthlyRow[]>();

  if (error) {
    console.error("Failed to load monthly rankings:", error);
    return null;
  }

  const normalized = (data ?? []).map((row, idx) => normalizeRow(row, idx));
  if (normalized.length === 0) return null;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">이번달 랭킹</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            지난 30일 동안 가장 사랑받은 책이에요
          </p>
        </div>
      </div>

      {/* simple list, medium spacing */}
      <ul className="mt-4 space-y-4">
        {normalized.map(book => (
          <li key={book.id}>
            <Link
              href={`/books/${book.id}`}
              className="flex items-center gap-2 text-sm hover:bg-muted/40 rounded-md p-2 transition-colors"
            >
              <span className="w-6 text-muted-foreground font-semibold text-lg">
                {book.rank}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="font-medium">{book.title}</span>
                <span className="text-muted-foreground text-xs">{book.author}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}