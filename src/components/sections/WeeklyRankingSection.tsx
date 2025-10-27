import { Card, CardContent } from "@/components/ui/card";

export default function WeeklyRankingSection() {
  // Placeholder data – replace with Supabase query later
  const books = [
    { id: 1, title: "사랑의 이해", author: "이형식" },
    { id: 2, title: "햄버거 남남짭짭", author: "김철수" },
    { id: 3, title: "인생을 바꾸는 독서", author: "박영희" },
    { id: 4, title: "데이터 엔지니어링 입문", author: "홍길동" },
    { id: 5, title: "고양이와 책", author: "최민수" },
  ];

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">이번주 랭킹</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            독자들이 가장 많이 하트를 누른 책이에요
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {books.map((b, idx) => (
          <Card key={b.id}>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <span className="text-lg font-semibold text-muted-foreground w-6">
                {idx + 1}
              </span>
              <div className="flex flex-col">
                <span className="font-medium">{b.title}</span>
                <span className="text-sm text-muted-foreground">{b.author}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
