import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getOptionalServerEnv } from "@/lib/env";

function normIsbn(raw: string) {
  // strip spaces/hyphens; Kakao accepts both 10/13; we key by cleaned string
  return raw.replace(/[\s-]/g, "");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isbnRaw = searchParams.get("isbn");
  if (!isbnRaw) {
    return NextResponse.json({ error: "isbn required" }, { status: 400 });
  }

  const isbn = normIsbn(isbnRaw);
  const key = `isbn:${isbn}`;

  // 1) try cache
  const cached = await redis.get<typeof minimal>(key);
  if (cached) return NextResponse.json(cached);

  // 2) call Kakao API (target=isbn for precision)
  const apiKey = getOptionalServerEnv("KAKAO_REST_API_KEY");
  if (!apiKey) {
    console.error("[api/kakao/book] Missing KAKAO_REST_API_KEY");
    return NextResponse.json({ error: "kakao api key missing" }, { status: 503 });
  }

  const url = `https://dapi.kakao.com/v3/search/book?target=isbn&query=${encodeURIComponent(isbn)}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    // small server-side timeout helps prevent hanging
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "kakao error", status: res.status }, { status: 502 });
  }

  const data = await res.json();
  const doc = data?.documents?.[0] ?? null;

  const minimal = doc
    ? {
        title: doc.title ?? null,
        thumbnail: doc.thumbnail ?? null,
        authors: doc.authors ?? [],
        datetime: doc.datetime ?? null,
        publisher: doc.publisher ?? null,
        // keep it tiny; do NOT mirror images or store full blobs
      }
    : null;

  // 3) store short TTL (24h). Adjust to 48–72h if you like.
  await redis.set(key, minimal, { ex: 60 * 60 * 24 });

  return NextResponse.json(minimal, {
    headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" },
  });
}
