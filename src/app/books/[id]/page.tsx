import LikeButton from "@/components/LikeButton";
import { kakaoLookupByIsbn } from "@/lib/kakaoSearch";
import CoverImage from "@/components/CoverImage";

export const revalidate = 3600; // ISR 1h

export default async function BookDetailPage({
  params,
}: {
  params: { id: string }; // isbn13
}) {
  const isbn13 = params.id;
  const kb = await kakaoLookupByIsbn(isbn13);

  if (!kb) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 aspect-[2/3] w-40 rounded-xl bg-muted" />
        <div className="text-base font-medium text-foreground">책 정보를 찾을 수 없어요</div>
        <div className="mt-2 text-sm text-muted-foreground">
          요청한 ISBN: <span className="font-mono text-foreground">{isbn13}</span>
        </div>
      </main>
    );
  }

  const { title, authors, publisher, datetime, thumbnail, contents } = kb;

  // Kyobo first, Kakao fallback
  const kyoboCover = `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn13}.jpg`;
  const kakaoCover = thumbnail || null;

  // Year (safe parse)
  let year: number | null = null;
  if (datetime) {
    const t = Date.parse(datetime);
    if (!Number.isNaN(t)) year = new Date(t).getFullYear();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <section className="grid gap-6 md:grid-cols-2 md:gap-10">
        {/* LEFT: cover (client component handles fallback) */}
        <div className="flex justify-center md:block">
          <div className="w-full max-w-[360px]">
            <CoverImage
              primarySrc={kyoboCover}
              fallbackSrc={kakaoCover}
              alt={title ?? "책 표지"}
            />
          </div>
        </div>

        {/* RIGHT: title + meta */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h1 className="text-2xl md:text-3xl font-semibold leading-snug tracking-tight line-clamp-3 break-words">
            {title ?? "제목 정보 없음"}
          </h1>

          <div className="mt-2 text-base text-muted-foreground leading-snug">
            {authors?.length ? authors.join(", ") : "저자 정보 없음"}
          </div>

          <div className="mt-1 text-sm text-muted-foreground leading-snug">
            {(publisher ?? "출판사 정보 없음")}{year ? ` · ${year}` : ""}
          </div>

          <div className="mt-3">
            <LikeButton isbn13={kb.isbn13} />
          </div>

          <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-foreground/90 max-w-prose">
            {contents?.trim() ? contents : "소개 정보가 아직 없습니다."}
          </p>
        </div>
      </section>
    </main>
  );
}
