import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ documents: [] });

  const cacheKey = `search:${q}`;
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  const apiKey = process.env.KAKAO_REST_API_KEY!;
  const url = `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(q)}&size=30`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Kakao search error", res.status, text);
    return NextResponse.json({ error: "kakao error", status: res.status }, { status: 502 });
  }

  const data = await res.json();
  const docs = (data?.documents ?? []).map((d: any) => ({
    isbn13: d.isbn?.split(" ").pop() ?? "",
    title: d.title ?? null,
    authors: d.authors ?? [],
    publisher: d.publisher ?? null,
    thumbnail: d.thumbnail ?? null,
  }));

  // Cache for 1 hour
  await redis.set(cacheKey, { documents: docs }, { ex: 60 * 60 });
  return NextResponse.json({ documents: docs });
}
