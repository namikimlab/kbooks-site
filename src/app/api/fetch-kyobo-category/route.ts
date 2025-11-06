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
import { getKyoboProductUrlFromIsbn } from "@/utils/kyobo";

const KYOOBO_RESOLVE_TIMEOUT_MS = 4000;
const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const APIFY_TASK_ID = process.env.APIFY_TASK_ID!; 
const WEBHOOK_SECRET = process.env.KBOOKS_WEBHOOK_SECRET!;

async function fetchWithTimeout(url: string, method: "GET" | "HEAD") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KYOOBO_RESOLVE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method, signal: controller.signal });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveKyoboUrl(isbn13: string, current: string | null) {
  if (current) return current;
  const resolved = await getKyoboProductUrlFromIsbn(isbn13, fetchWithTimeout);
  if (resolved) return resolved;
  return `https://search.kyobobook.co.kr/search?keyword=${isbn13}`;
}

/**
 * Runs the Apify Task directly, overriding startUrls in its input.
 */
async function triggerApifyTask(isbn13: string, startUrl: string) {
  const endpoint = `https://api.apify.com/v2/actor-tasks/${APIFY_TASK_ID}/runs?token=${APIFY_TOKEN}`;

  const overrides = {
    startUrls: [{ url: startUrl }],
    isbn13,
    webhook_secret: WEBHOOK_SECRET,
  };

  console.log("[fetch-kyobo-category] Triggering Apify Task with override:", {
    isbn13,
    startUrl,
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(overrides),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify task failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawIsbn = searchParams.get("isbn") ?? "";
  const isbn13 = normalizeToIsbn13(rawIsbn);
  if (!isbn13)
    return NextResponse.json({ error: "invalid isbn" }, { status: 400 });

  console.log("[fetch-kyobo-category] start", { isbn13 });

  let book: BookRow | null = await getBookByIsbn13(isbn13).catch(() => null);
  if (!book) book = await ensureBookStub(isbn13).catch(() => null);
  if (!book)
    return NextResponse.json({ error: "db error" }, { status: 500 });

  if (!shouldFetchKyoboCategory(book))
    return NextResponse.json({ status: "skipped" });

  const kyoboUrl = await resolveKyoboUrl(isbn13, book?.kyobo_url ?? null);
  if (kyoboUrl && kyoboUrl !== book?.kyobo_url)
    await upsertKyoboUrlOnly(isbn13, kyoboUrl).catch(console.error);

  try {
    const apifyRes = await triggerApifyTask(isbn13, kyoboUrl);
    console.log("[fetch-kyobo-category] Task queued:", {
      isbn13,
      kyoboUrl,
      runId: apifyRes?.data?.id ?? apifyRes?.id,
    });

    await markKyoboFetchAttempt(isbn13);
    return NextResponse.json(
      { status: "queued", kyoboUrl, run: apifyRes },
      { status: 202 }
    );
  } catch (err) {
    console.error("[fetch-kyobo-category] Trigger failed:", err);
    return NextResponse.json({ error: "trigger failed" }, { status: 502 });
  }
}
