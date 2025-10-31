import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export default function TrendingBooksSection() {
  // Static Supabase cover for now
  const placeholderCover =
    "https://nthahtfalfrrzesxlzhy.supabase.co/storage/v1/object/public/covers_sample/book2.jpg";

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">지금 뜨는 책</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            지금 누군가가 하트를 눌렀어요
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <ul className="flex gap-4">
          {[...Array(10)].map((_, i) => (
            <li key={i} className="w-32 flex-shrink-0">
              <Card className="overflow-hidden">
                <CardContent className="p-2">
                  <div className="relative aspect-[2/3] w-full rounded-md bg-muted">
                    <Image
                      src={`/api/covers/${b.isbn13}`}
                      alt={b.title ?? "책 표지"}
                      width={120}
                      height={174}
                      className="rounded-md object-cover bg-muted"
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
