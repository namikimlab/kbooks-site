import { NextResponse } from "next/server";
import { normalizeToIsbn13 } from "@/lib/isbn";
import { updateKyoboCategory, upsertKyoboRawPayload } from "@/lib/books";
import { revalidateTag } from "next/cache";

const WEBHOOK_SECRET = process.env.KBOOKS_WEBHOOK_SECRET;

function extractPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.payload) return extractPayload(obj.payload);
  if (obj.data) return extractPayload(obj.data);
  return obj;
}

function sanitizeCategories(value: unknown) {
  if (!Array.isArray(value)) return null;
  const cleaned = value
    .map(item => (typeof item === "string" ? item.trim() : ""))
    .filter((item: string) => item.length > 0);
  return cleaned.length > 0 ? cleaned : null;
}

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("[apify-kyobo-callback] WEBHOOK secret missing");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const providedSecret =
    req.headers.get("x-kbooks-webhook-secret") ??
    req.headers.get("x-apify-secret") ??
    req.headers.get("x-webhook-secret") ??
    "";
  if (providedSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch (err) {
    console.error("[apify-kyobo-callback] invalid JSON:", err);
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const payload = extractPayload(parsed);
  if (!payload) {
    return NextResponse.json({ error: "missing payload" }, { status: 400 });
  }

  const rawIsbnValue = payload["isbn13"] ?? payload["isbn"];
  const rawIsbn = rawIsbnValue !== undefined ? String(rawIsbnValue) : "";
  const isbn13 = normalizeToIsbn13(String(rawIsbn));
  if (!isbn13) {
    return NextResponse.json({ error: "invalid isbn" }, { status: 400 });
  }

  const kyoboUrl =
    typeof payload["kyobo_url"] === "string"
      ? (payload["kyobo_url"] as string)
      : typeof payload["kyoboUrl"] === "string"
      ? (payload["kyoboUrl"] as string)
      : null;

  const categories =
    sanitizeCategories(payload["category"]) ??
    sanitizeCategories(payload["categories"]);

  const scrapedAtRaw = payload["scraped_at"] ?? payload["scrapedAt"] ?? null;
  const scrapedAt =
    typeof scrapedAtRaw === "string" && !Number.isNaN(Date.parse(scrapedAtRaw))
      ? new Date(scrapedAtRaw).toISOString()
      : null;

  try {
    await upsertKyoboRawPayload(isbn13, payload, scrapedAt ?? undefined);
    await updateKyoboCategory(isbn13, {
      kyoboUrl,
      categories,
    });
  } catch (err) {
    console.error(`[apify-kyobo-callback] supabase update failed for ${isbn13}:`, err);
    return NextResponse.json({ error: "supabase error" }, { status: 500 });
  }

  try {
    revalidateTag(`book:${isbn13}`);
  } catch (err) {
    console.warn(`[apify-kyobo-callback] revalidate failed for ${isbn13}:`, err);
  }

  return NextResponse.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
