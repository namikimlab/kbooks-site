// lib/kakaoSearch.ts (server-only)
import { splitKakaoIsbn, toIsbn13, isValidIsbn13 } from "@/lib/isbn";
import { redis } from "@/lib/redis";

export async function kakaoSearch(q: string) {
  const key = `search:${q}`;
  const cached = await redis.get(key);
  if (cached) return cached as any;

  const apiKey = process.env.KAKAO_REST_API_KEY!;
  const url = `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(q)}&size=30`;
  const r = await fetch(url, { headers: { Authorization: `KakaoAK ${apiKey}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`kakao ${r.status}`);
  const data = await r.json();

  return {
    documents: (data.documents || []).map((d: any) => {
      const { isbn10, isbn13 } = splitKakaoIsbn(d.isbn);
      const chosen13 =
        (isbn13 && isValidIsbn13(isbn13)) ? isbn13 :
        (isbn10 ? toIsbn13(isbn10) : ""); // ensure you still get a 13 for routing

      return {
        isbn13: chosen13,
        isbn10: isbn10 ?? null,
        title: d.title ?? null,
        authors: d.authors ?? null,
        publisher: d.publisher ?? null,
        thumbnail: d.thumbnail ?? null,
        datetime: d.datetime ?? null,
      };
    }),
  };
}

export async function kakaoLookupByIsbn(isbn: string) {
  const url = new URL("https://dapi.kakao.com/v3/search/book");
  url.searchParams.set("target", "isbn");
  url.searchParams.set("query", isbn);
  url.searchParams.set("size", "1");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Kakao error: ${res.status}`);
  const data = await res.json();
  const doc = data?.documents?.[0];
  if (!doc) return null;

  const { isbn10, isbn13 } = splitKakaoIsbn(doc.isbn);
  const isbn13Final = isbn13 ?? (isbn10 ? toIsbn13(isbn10) : "");

  return {
    isbn13: isbn13Final,
    isbn10: isbn10 ?? null,
    title: doc.title ?? null,
    authors: doc.authors ?? [],
    publisher: doc.publisher ?? null,
    datetime: doc.datetime ?? null,
    thumbnail: doc.thumbnail ?? null,
    contents: doc.contents ?? "",
  };
}