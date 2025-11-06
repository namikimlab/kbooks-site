// app/api/apify-kyobo-callback/route.ts
import { NextResponse } from "next/server";
import { normalizeToIsbn13 } from "@/lib/isbn";
import { updateKyoboCategory, upsertKyoboRawPayload } from "@/lib/books";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs"; // ensures env vars work properly

const WEBHOOK_SECRET = process.env.KBOOKS_WEBHOOK_SECRET ?? "";

function extractPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  // recursively unwrap nested payload/data/resource structures
  if (obj.payload) return extractPayload(obj.payload);
  if (obj.data) return extractPayload(obj.data);
  if (obj.resource) return extractPayload(obj.resource);
  return obj;
}

type BreadcrumbEntry = string | { text?: string; title?: string; name?: string };

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return null;
  const cleaned = Array.from(
    new Set(
      value
        .map(item => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object") {
            const entry = item as BreadcrumbEntry;
            return (
              entry.text?.trim() ||
              entry.title?.trim() ||
              entry.name?.trim() ||
              ""
            );
          }
          return "";
        })
        .filter((item: string) => item.length > 0)
    )
  );
  return cleaned.length > 0 ? cleaned : null;
}

export async function POST(req: Request) {
  // 1. Verify secret
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
    console.warn("[apify-kyobo-callback] Unauthorized attempt");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse JSON body
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch (err) {
    console.error("[apify-kyobo-callback] invalid JSON:", err);
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  console.log("[apify-kyobo-callback] raw body:", JSON.stringify(parsed, null, 2));

  // 3. Extract payload (handles nested resource/payload/data)
  const payload = extractPayload(parsed);
  if (!payload) {
    console.error("[apify-kyobo-callback] missing payload");
    return NextResponse.json({ error: "missing payload" }, { status: 400 });
  }

  // 4. Extract ISBN
  const rawIsbnValue = payload["isbn13"] ?? payload["isbn"];
  const rawIsbn = rawIsbnValue !== undefined ? String(rawIsbnValue) : "";
  const isbn13 = normalizeToIsbn13(rawIsbn);

  // Apify test events don’t contain ISBN — just acknowledge them
  if (!isbn13) {
    console.log("[apify-kyobo-callback] No ISBN found (likely test event)");
    return NextResponse.json({ ok: true, note: "Test event received" });
  }

  // 5. Extract optional fields
  const kyoboUrl =
    typeof payload["kyobo_url"] === "string"
      ? (payload["kyobo_url"] as string)
      : typeof payload["kyoboUrl"] === "string"
      ? (payload["kyoboUrl"] as string)
      : typeof payload["url"] === "string"
      ? (payload["url"] as string)
      : null;

  const categories =
    sanitizeStringArray(payload["breadcrumbs"]) ??
    sanitizeStringArray(payload["breadcrumb"]) ??
    sanitizeStringArray(payload["categoryPath"]) ??
    sanitizeStringArray(payload["category"]) ??
    sanitizeStringArray(payload["categories"]);

  console.log(
    "[apify-kyobo-callback] normalized categories",
    categories,
    "kyoboUrl",
    kyoboUrl
  );

  const scrapedAtRaw =
    payload["scraped_at"] ??
    payload["scrapedAt"] ??
    payload["last_updated"] ??
    payload["lastUpdated"] ??
    null;
  const scrapedAt =
    typeof scrapedAtRaw === "string" && !Number.isNaN(Date.parse(scrapedAtRaw))
      ? new Date(scrapedAtRaw).toISOString()
      : null;

  // 6. Upsert data into Supabase
  try {
    await upsertKyoboRawPayload(isbn13, payload, scrapedAt ?? undefined);
    await updateKyoboCategory(isbn13, { kyoboUrl, categories });
  } catch (err) {
    console.error(`[apify-kyobo-callback] supabase update failed for ${isbn13}:`, err);
    return NextResponse.json({ error: "supabase error" }, { status: 500 });
  }

  // 7. Revalidate cache tag (non-fatal)
  try {
    revalidateTag(`book:${isbn13}`);
  } catch (err) {
    console.warn(`[apify-kyobo-callback] revalidate failed for ${isbn13}:`, err);
  }

  // 8. Success
  return NextResponse.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
