import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import {
  BookRow,
  KakaoBookUpsertPayload,
  getBookByIsbn13,
  upsertKakaoBook,
} from "@/lib/books";
import { normalizeToIsbn13 } from "@/lib/isbn";

const TTL_SECONDS = 60 * 60 * 24;
const FETCH_TIMEOUT_MS = 5000;

type NormalizedKakao = {
  title: string | null;
  authors: string[];
  publisher: string | null;
  publishDate: string | null;
  description: string | null;
};

function normalizeKakaoDoc(doc: unknown): NormalizedKakao | null {
  if (!doc || typeof doc !== "object") return null;
  const record = doc as Record<string, unknown>;

  const title =
    typeof record.title === "string" ? record.title.trim() || null : null;
  const publisher =
    typeof record.publisher === "string" ? record.publisher.trim() || null : null;
  const description =
    typeof record.contents === "string" ? record.contents.trim() || null : null;

  const authors = Array.isArray(record.authors)
    ? record.authors
        .map(item => (typeof item === "string" ? item.trim() : ""))
        .filter((value: string) => value.length > 0)
    : [];

  let publishDate: string | null = null;
  if (typeof record.datetime === "string") {
    const date = new Date(record.datetime);
    if (!Number.isNaN(date.getTime())) {
      publishDate = date.toISOString().slice(0, 10);
    }
  }

  return {
    title,
    authors,
    publisher,
    publishDate,
    description,
  };
}

async function fetchFromKakao(isbn13: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `https://dapi.kakao.com/v3/search/book?target=isbn&query=${encodeURIComponent(
      isbn13
    )}&size=1`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[fetch-kakao] Kakao error ${res.status}: ${text}`);
      return null;
    }

    const data = await res.json();
    return data?.documents?.[0] ?? null;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.error(`[fetch-kakao] Kakao fetch timed out for ${isbn13}`);
    } else {
      console.error(`[fetch-kakao] Kakao fetch failed for ${isbn13}:`, err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function upsertSupabase(isbn13: string, normalized: NormalizedKakao | null) {
  const payload: KakaoBookUpsertPayload | null = normalized
    ? {
        title: normalized.title,
        authors: normalized.authors,
        publisher: normalized.publisher,
        publishDate: normalized.publishDate,
        description: normalized.description,
      }
    : null;

  return upsertKakaoBook(isbn13, payload);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawIsbn = searchParams.get("isbn") ?? "";

  const isbn13 = normalizeToIsbn13(rawIsbn);
  if (!isbn13) {
    return NextResponse.json({ error: "invalid isbn" }, { status: 400 });
  }

  const cacheKey = `kakao:book:${isbn13}`;
  let normalized: NormalizedKakao | null = null;
  let cacheHit = false;

  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) {
      try {
        normalized = JSON.parse(cached) as NormalizedKakao | null;
        cacheHit = true;
      } catch (err) {
        console.warn(`[fetch-kakao] cache parse failed for ${isbn13}:`, err);
      }
    }
  } catch (err) {
    console.error(`[fetch-kakao] cache read error for ${isbn13}:`, err);
  }

  if (!normalized) {
    const doc = await fetchFromKakao(isbn13);
    normalized = normalizeKakaoDoc(doc);

    try {
      await redis.set(cacheKey, JSON.stringify(normalized), { ex: TTL_SECONDS });
    } catch (err) {
      console.error(`[fetch-kakao] cache write error for ${isbn13}:`, err);
    }
  }

  let book: BookRow | null = null;
  try {
    book = await upsertSupabase(isbn13, normalized);
  } catch (err) {
    console.error(`[fetch-kakao] supabase upsert failed for ${isbn13}:`, err);
    return NextResponse.json({ error: "supabase error" }, { status: 500 });
  }

  if (!book) {
    book = await getBookByIsbn13(isbn13);
  }

  return NextResponse.json(
    {
      isbn13,
      cacheHit,
      kakao: normalized,
      book,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
