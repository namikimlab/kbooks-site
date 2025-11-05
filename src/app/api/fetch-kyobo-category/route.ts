import { NextResponse } from "next/server";
import {
  BookRow,
  ensureBookStub,
  getBookByIsbn13,
  markKyoboFetchAttempt,
  shouldFetchKyoboCategory,
  upsertKyoboUrlOnly,
} from "@/lib/books";
import { normalizeToIsbn13 } from "@/lib/isbn";

const KYOOBO_RESOLVE_TIMEOUT_MS = 4000;
const KYOOBO_AUTOCOMPLETE_URL =
  "https://search.kyobobook.co.kr/srp/api/v1/search/autocomplete/shop";
const KYOOBO_PRODUCT_URL_PREFIX = "https://product.kyobobook.co.kr/detail/";

type KyoboAutocompleteDocument = {
  CMDTCODE?: string;
  SALE_CMDTID?: string;
  [key: string]: unknown;
};

type KyoboAutocompleteResponse = {
  data?: {
    resultDocuments?: KyoboAutocompleteDocument[];
  };
};

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_TASK_ID = process.env.APIFY_TASK_ID;
const WEBHOOK_SECRET = process.env.KBOOKS_WEBHOOK_SECRET;

async function fetchWithTimeout(url: string, method: "HEAD" | "GET") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KYOOBO_RESOLVE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      console.error(`[fetch-kyobo-category] resolve ${method} failed for ${url}:`, err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveKyoboUrl(isbn13: string, current: string | null) {
  if (current) return current;

  const kyoboUrlFromAutocomplete = await resolveKyoboUrlFromAutocomplete(isbn13);
  if (kyoboUrlFromAutocomplete) return kyoboUrlFromAutocomplete;

  const candidates = [
    `https://product.kyobobook.co.kr/detail/${isbn13}`,
    `https://search.kyobobook.co.kr/product/detail/${isbn13}`,
  ];

  for (const candidate of candidates) {
    const headRes = await fetchWithTimeout(candidate, "HEAD");
    if (headRes && headRes.ok) return candidate;

    const getRes = await fetchWithTimeout(candidate, "GET");
    if (getRes && getRes.ok) return candidate;
  }

  return null;
}

async function resolveKyoboUrlFromAutocomplete(isbn13: string) {
  const searchParams = new URLSearchParams({
    callback: "autocompleteShop",
    keyword: isbn13,
  });
  const endpoint = `${KYOOBO_AUTOCOMPLETE_URL}?${searchParams.toString()}`;

  const res = await fetchWithTimeout(endpoint, "GET");
  if (!res || !res.ok) return null;

  const body = (await res.text()).trim();
  if (!body) return null;

  const match = body.match(/^autocompleteShop\((.*)\);?$/s);
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch (err) {
    console.error(
      `[fetch-kyobo-category] autocomplete JSON parse failed for ${isbn13}:`,
      err
    );
    return null;
  }

  const documents = (parsed as KyoboAutocompleteResponse)?.data?.resultDocuments ?? [];
  if (!documents.length) return null;

  const saleCmdt =
    documents.find((doc) => doc.CMDTCODE === isbn13)?.SALE_CMDTID ??
    documents[0]?.SALE_CMDTID;
  if (!saleCmdt) return null;

  const url = `${KYOOBO_PRODUCT_URL_PREFIX}${saleCmdt}`;

  const validationRes = await fetchWithTimeout(url, "HEAD");
  if (validationRes && validationRes.ok) return url;

  const fallbackValidationRes = await fetchWithTimeout(url, "GET");
  if (fallbackValidationRes && fallbackValidationRes.ok) return url;

  return null;
}

async function triggerApify(isbn13: string, kyoboUrl: string | null) {
  if (!APIFY_TOKEN || !APIFY_TASK_ID) {
    throw new Error("Apify configuration missing");
  }

  const endpoint = `https://api.apify.com/v2/actor-tasks/${APIFY_TASK_ID}/runs?waitForFinish=0`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${APIFY_TOKEN}`,
      "Content-Type": "application/json",
    },
      body: JSON.stringify({
        input: {
          isbn13,
          kyobo_url: kyoboUrl,
          webhook_secret: WEBHOOK_SECRET,
        },
      }),
    });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify run failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawIsbn = searchParams.get("isbn") ?? "";

  const isbn13 = normalizeToIsbn13(rawIsbn);
  if (!isbn13) {
    return NextResponse.json({ error: "invalid isbn" }, { status: 400 });
  }

  let book: BookRow | null;
  try {
    book = await getBookByIsbn13(isbn13);
  } catch (err) {
    console.error(`[fetch-kyobo-category] supabase read failed for ${isbn13}:`, err);
    return NextResponse.json({ error: "supabase error" }, { status: 500 });
  }

  if (!book) {
    try {
      book = await ensureBookStub(isbn13);
    } catch (err) {
      console.error(`[fetch-kyobo-category] stub insert failed for ${isbn13}:`, err);
      return NextResponse.json({ error: "supabase error" }, { status: 500 });
    }
  }

  const shouldFetch = shouldFetchKyoboCategory(book);
  if (!shouldFetch) {
    return NextResponse.json({ status: "skipped" }, { headers: { "Cache-Control": "no-store" } });
  }

  const kyoboUrl = await resolveKyoboUrl(isbn13, book?.kyobo_url ?? null);
  if (kyoboUrl && kyoboUrl !== book?.kyobo_url) {
    try {
      book = await upsertKyoboUrlOnly(isbn13, kyoboUrl);
    } catch (err) {
      console.error(`[fetch-kyobo-category] kyobo_url upsert failed for ${isbn13}:`, err);
    }
  }

  try {
    const apifyRes = await triggerApify(isbn13, kyoboUrl);
    await markKyoboFetchAttempt(isbn13);

    return NextResponse.json(
      { status: "queued", run: apifyRes },
      {
        status: 202,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error(`[fetch-kyobo-category] trigger failed for ${isbn13}:`, err);
    return NextResponse.json({ error: "trigger failed" }, { status: 502 });
  }
}
