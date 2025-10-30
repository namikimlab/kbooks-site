// lib/kakaoSearch.ts (server-only)
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
  const docs = (data?.documents ?? []).map((d: any) => ({
    isbn13: d.isbn?.split(" ").pop() ?? "",
    title: d.title ?? null,
    authors: d.authors ?? [],
    publisher: d.publisher ?? null,
    thumbnail: d.thumbnail ?? null,
  }));
  const result = { documents: docs };
  await redis.set(key, result, { ex: 3600 });
  return result;
}
