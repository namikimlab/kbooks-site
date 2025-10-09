// src/app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        책판 — 커뮤니티 신호로 좋은 책을 찾자
      </h1>

      <p className="max-w-prose text-sm text-muted-foreground">
        MVP 버전입니다. 상단 검색으로 제목·저자·ISBN을 찾아보세요. 곧 좋아요/랭킹/내 책판을 추가합니다.
      </p>

      <div className="flex items-center gap-3">
        <Link href="/search">
          <Button size="sm">지금 검색하기</Button>
        </Link>
        <Link href="/top10" className="text-sm underline underline-offset-4">
          이번 주 TOP10 보기
        </Link>
      </div>
    </section>
  );
}
