// lib/kakaoSearch.ts  (server-only)
import { splitKakaoIsbn, toIsbn13, isValidIsbn13 } from "@/lib/isbn";
import { redis } from "@/lib/redis";

export interface KakaoBookDocument {
  authors?: string[];
  contents?: string;
  datetime?: string;
  isbn?: string;
  price?: number;
  publisher?: string;
  sale_price?: number;
  status?: string;
  thumbnail?: string;
  title?: string;
  translators?: string[];
  url?: string;
}

export interface KakaoBookSearchMeta {
  is_end: boolean;
  pageable_count: number;
  total_count: number;
}

export interface KakaoBookSearchResponse {
  documents?: KakaoBookDocument[];
  meta?: KakaoBookSearchMeta;
}

/**
 * Kakao Book Search with pagination and Redis caching.
 * @param q     Search query
 * @param page  Page number (1–50, default 1)
 * @param size  Results per page (1–50, default 30)
 */
export async function kakaoSearch(q: string, page: number = 1, size: number = 30) {
  // normalize inputs
  const clampedPage = Math.max(1, Math.min(50, page));
  const clampedSize = Math.max(1, Math.min(50, size));

  // Redis cache key includes page & size
  const key = `search:${q}:${clampedPage}:${clampedSize}`;
  const cached = await redis.get<string | KakaoBookSearchResponse>(key);
  if (cached) {
    if (typeof cached === "string") {
      try {
        return JSON.parse(cached) as KakaoBookSearchResponse;
      } catch {
        // fall through to bypass corrupted cache entries
      }
    } else {
      return cached;
    }
  }

  const apiKey = process.env.KAKAO_REST_API_KEY!;
  const url = new URL("https://dapi.kakao.com/v3/search/book");
  url.searchParams.set("query", q);
  url.searchParams.set("page", String(clampedPage));
  url.searchParams.set("size", String(clampedSize));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`kakao ${res.status}`);

  const data = (await res.json()) as KakaoBookSearchResponse;

  const documents = (data.documents ?? []).map(doc => {
    const { isbn10, isbn13 } = splitKakaoIsbn(doc.isbn);
    const chosen13 =
      isbn13 && isValidIsbn13(isbn13)
        ? isbn13
        : isbn10
        ? toIsbn13(isbn10)
        : ""; // ensure a 13 for routing

    return {
      isbn13: chosen13,
      isbn10: isbn10 ?? null,
      title: doc.title ?? null,
      authors: doc.authors ?? null,
      publisher: doc.publisher ?? null,
      thumbnail: doc.thumbnail ?? null,
      datetime: doc.datetime ?? null,
    };
  });

  const result = {
    documents,
    meta: data.meta ?? {
      is_end: true,
      pageable_count: documents.length,
      total_count: documents.length,
    },
  };

  // Cache for 5 minutes
  await redis.setex(key, 300, JSON.stringify(result));

  return result;
}

/**
 * Lookup a single book by ISBN (same as before)
 */
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
