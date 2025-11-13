"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExplorePage() {
  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-6">
        <div className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          발견하기
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">읽고 싶은 리스트를 찾아보세요</h1>
        <p className="text-sm text-muted-foreground">
          오늘의 추천, 인기 급상승, 새로 올라온 리스트, 그리고 테마별 큐레이션을 곧 보여줄 예정이에요.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">📌 오늘의 추천 리스트</h2>
          <span className="text-sm text-muted-foreground">오늘 하루에 어울리는 큐레이션</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={`daily-card-${index}`} className="h-44 border-dashed">
              <CardHeader>
                <CardTitle className="text-base">추천 리스트 {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                곧 이 자리에 추천 리스트가 표시돼요.
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">🔥 인기 리스트</h2>
          <span className="text-sm text-muted-foreground">가장 많은 관심을 받은 리스트</span>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={`popular-${index}`} className="h-32 border-dashed">
              <CardContent className="flex h-full flex-col justify-between py-4 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">인기 리스트 {index + 1}</span>
                <span className="text-xs">곧 콘텐츠가 들어올 예정이에요.</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">🆕 새로 올라온 리스트</h2>
          <span className="text-sm text-muted-foreground">방금 올라온 최신 리스트</span>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={`fresh-${index}`} className="border-dashed">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="size-12 rounded-full bg-muted" />
                <div className="flex-1">
                  <p className="font-medium">새 리스트 {index + 1}</p>
                  <p className="text-sm text-muted-foreground">사용자 아바타 + 리스트 제목 자리</p>
                </div>
                <div className="text-xs text-muted-foreground">방금 전</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">📚 테마별 리스트</h2>
          <span className="text-sm text-muted-foreground">테마/카테고리 기반 큐레이션</span>
        </div>
        <div className="space-y-6">
          {["문학", "에세이", "인문", "라이프스타일"].map(category => (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{category}</p>
                <span className="text-xs text-muted-foreground">캐러셀 영역</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={`${category}-${index}`} className="min-w-[220px] border-dashed">
                    <CardContent className="py-6">
                      <p className="font-medium">{category} 리스트 {index + 1}</p>
                      <p className="text-sm text-muted-foreground">곧 리스트 카드가 들어와요.</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex justify-center border-t border-border/70 pt-6">
        <Button asChild variant="default">
          <Link href="/lists/new">+ 새 리스트 만들기</Link>
        </Button>
      </footer>
    </section>
  );
}
