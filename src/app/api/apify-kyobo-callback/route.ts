// app/api/apify-kyobo-callback/route.ts
import { NextResponse } from "next/server";
import { normalizeToIsbn13 } from "@/lib/isbn";
import { updateKyoboCategory, upsertKyoboRawPayload } from "@/lib/books";
import { revalidateTag } from "next/cache";
import { getOptionalServerEnv } from "@/lib/env";

export const runtime = "nodejs";

const WEBHOOK_SECRET = getOptionalServerEnv("KBOOKS_WEBHOOK_SECRET") ?? "";
const APIFY_TOKEN = getOptionalServerEnv("APIFY_TOKEN") ?? "";

type DatasetItem = Record<string, unknown>;
type BreadcrumbLeaf = { text?: string; title?: string; name?: string };
type BreadcrumbEntry = string | BreadcrumbLeaf;

function sanitizeCategories(value: unknown) {
  if (!Array.isArray(value)) return null;
  const unique = new Set<string>();
  for (const entry of value) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed) unique.add(trimmed);
      continue;
    }
    if (entry && typeof entry === "object") {
      const item = entry as BreadcrumbLeaf;
      const maybe =
        item.text?.trim() ?? item.title?.trim() ?? item.name?.trim() ?? "";
      if (maybe) unique.add(maybe);
    }
  }
  return unique.size ? Array.from(unique) : null;
}

function toIso(value: unknown) {
  if (typeof value !== "string") return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toISOString();
}

function isTemplate(value: string | undefined | null) {
  if (!value) return false;
  return value.startsWith("{{") && value.endsWith("}}");
}

async function fetchFirstDatasetItem(datasetId: string) {
  if (!datasetId) return null;

  if (!APIFY_TOKEN) {
    console.error("[apify-kyobo-callback] Missing APIFY_TOKEN for dataset fetch", { datasetId });
    return null;
  }

  const url = new URL(`https://api.apify.com/v2/datasets/${datasetId}/items`);
  url.searchParams.set("clean", "true");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("token", APIFY_TOKEN);

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[apify-kyobo-callback] Dataset fetch failed ${datasetId}: ${res.status} ${text}`
      );
      return null;
    }

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== "object") {
      console.warn("[apify-kyobo-callback] Dataset empty or invalid", { datasetId });
      return null;
    }
    return data[0] as DatasetItem;
  } catch (err) {
    console.error(`[apify-kyobo-callback] Dataset fetch exception ${datasetId}:`, err);
    return null;
  }
}

async function fetchRun(runId: string) {
  if (!runId) return null;
  if (!APIFY_TOKEN) {
    console.error("[apify-kyobo-callback] Missing APIFY_TOKEN for run fetch", { runId });
    return null;
  }

  const url = new URL(`https://api.apify.com/v2/actor-runs/${runId}`);
  url.searchParams.set("token", APIFY_TOKEN);

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[apify-kyobo-callback] Run fetch failed ${runId}: ${res.status} ${text}`
      );
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    return data;
  } catch (err) {
    console.error(`[apify-kyobo-callback] Run fetch exception ${runId}:`, err);
    return null;
  }
}

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("[apify-kyobo-callback] Missing WEBHOOK secret env");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const providedSecret =
    req.headers.get("x-kbooks-webhook-secret") ??
    req.headers.get("x-apify-secret") ??
    req.headers.get("x-webhook-secret") ??
    "";

  if (providedSecret !== WEBHOOK_SECRET) {
    console.warn("[apify-kyobo-callback] Unauthorized webhook attempt");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch (err) {
    console.error("[apify-kyobo-callback] Invalid JSON", err);
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  console.log("[apify-kyobo-callback] raw body:", JSON.stringify(payload, null, 2));

  const status = typeof payload.status === "string" ? payload.status : "UNKNOWN";
  const isTemplateStatus = status.startsWith("{{") && status.endsWith("}}");
  const isSucceeded = status.toUpperCase() === "SUCCEEDED";
  if (!isSucceeded && !isTemplateStatus) {
    console.log("[apify-kyobo-callback] Run not finished yet", {
      status,
      runId: payload.runId,
    });
  }

  const runIdFromPayload =
    typeof payload.runId === "string" && !isTemplate(payload.runId) ? payload.runId : null;
  const runIdFromHeader = req.headers.get("x-apify-run-id");
  const runId = runIdFromPayload && !isTemplate(runIdFromPayload) ? runIdFromPayload : runIdFromHeader;

  let datasetId =
    typeof payload.defaultDatasetId === "string" && !isTemplate(payload.defaultDatasetId)
      ? payload.defaultDatasetId
      : "";

  if (!datasetId && runId) {
    const runData = await fetchRun(runId);
    datasetId =
      (typeof runData?.defaultDatasetId === "string" ? runData.defaultDatasetId : "") ||
      (typeof runData?.defaultDatasetId === "number" ? String(runData.defaultDatasetId) : "");
    if (!datasetId) {
      console.warn("[apify-kyobo-callback] Run lookup returned no dataset id", {
        runId,
        runData,
      });
    }
  }

  if (!datasetId) {
    console.error("[apify-kyobo-callback] Missing dataset id", {
      runId,
      payload,
    });
    return NextResponse.json({ error: "dataset missing" }, { status: 400 });
  }

  const item = await fetchFirstDatasetItem(datasetId);
  if (!item) {
    return NextResponse.json(
      { ok: true, note: "dataset empty" },
      { status: isSucceeded ? 200 : 202 }
    );
  }

  const rawIsbnValue = item["isbn13"] ?? item["isbn"] ?? item["ISBN13"];
  const isbn13 = normalizeToIsbn13(typeof rawIsbnValue === "string" ? rawIsbnValue : "");
  if (!isbn13) {
    console.warn("[apify-kyobo-callback] Dataset item missing valid ISBN", {
      datasetId,
      runId: payload.runId,
    });
    return NextResponse.json({ ok: true, note: "missing isbn" }, { status: 202 });
  }

  const kyoboUrl =
    typeof item["kyobo_url"] === "string"
      ? (item["kyobo_url"] as string)
      : typeof item["kyoboUrl"] === "string"
      ? (item["kyoboUrl"] as string)
      : typeof item["url"] === "string"
      ? (item["url"] as string)
      : null;

  const categories =
    sanitizeCategories(item["breadcrumbs"]) ??
    sanitizeCategories(item["breadcrumb"]) ??
    sanitizeCategories(item["categoryPath"]) ??
    sanitizeCategories(item["category"]) ??
    sanitizeCategories(item["categories"]);

  const scrapedAt =
    toIso(item["scraped_at"]) ??
    toIso(item["scrapedAt"]) ??
    toIso(payload["finishedAt"]) ??
    toIso(payload["finished_at"]);

  console.log("[apify-kyobo-callback] normalized result", {
    isbn13,
    kyoboUrl,
    categories,
    scrapedAt,
  });

  try {
    await upsertKyoboRawPayload(isbn13, item, scrapedAt ?? undefined);
    await updateKyoboCategory(isbn13, { kyoboUrl, categories });
  } catch (err) {
    console.error(`[apify-kyobo-callback] Supabase update failed for ${isbn13}:`, err);
    return NextResponse.json({ error: "supabase error" }, { status: 500 });
  }

  try {
    revalidateTag(`book:${isbn13}`);
  } catch (err) {
    console.warn(`[apify-kyobo-callback] revalidate failed for ${isbn13}:`, err);
  }

  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
