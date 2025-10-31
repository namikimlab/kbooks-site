// app/api/covers/[isbn]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kakaoLookupByIsbn } from "@/lib/kakaoSearch";
import crypto from "node:crypto";

const BUCKET = "book-covers";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVER_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVER_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVER_KEY);

// ---- placeholder detection ----
const KYOBO_PLACEHOLDER_SHA256 = new Set<string>([
  // From your attached image (458x664, 34,150 bytes)
  "9a7d8d19a70d6b6011b74850b98f18228e8a97bfb673e0268fa2ab8ce54f1690",
]);

const SMALL_BYTES_THRESHOLD = 25_000; // heuristic backup

function sha256Hex(u8: Uint8Array) {
  return crypto.createHash("sha256").update(u8).digest("hex");
}

function isKyoboPlaceholder(bytes: Uint8Array): boolean {
  const h = sha256Hex(bytes);
  if (KYOBO_PLACEHOLDER_SHA256.has(h)) return true;
  // Conservative size heuristic if Kyobo ever serves a slightly different placeholder
  if (bytes.byteLength < SMALL_BYTES_THRESHOLD) {
    console.warn("[covers] kyobo small candidate; treating as placeholder. sha256:", h, "bytes:", bytes.byteLength);
    return true;
  }
  // Log unknowns so you can add more hashes later if needed
  console.log("[covers] kyobo candidate sha256:", h, "bytes:", bytes.byteLength);
  return false;
}

// ---- handler ----
export async function GET(
  _req: Request,
  { params }: { params: { isbn: string } }
) {
  const isbn = params.isbn?.trim();
  if (!isbn) return NextResponse.json({ error: "Missing ISBN" }, { status: 400 });

  const key = `${isbn}.jpg`;

  // 1) Try cached copy
  try {
    const { data } = await supabase.storage.from(BUCKET).download(key);
    if (data) {
      const buf = Buffer.from(await data.arrayBuffer());
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
        },
      });
    }
  } catch (e) {
    console.error("[covers] storage.download error:", (e as Error)?.message);
  }

  let bytes: Uint8Array | null = null;
  let contentType = "image/jpeg";

  // 2) Kyobo
  try {
    const kyoboUrl = `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn}.jpg`;
    const r = await fetch(kyoboUrl, { cache: "no-store" });
    if (r.ok && r.headers.get("content-type")?.startsWith("image/")) {
      const candidate = new Uint8Array(await r.arrayBuffer());
      if (!isKyoboPlaceholder(candidate)) {
        bytes = candidate;
        contentType = r.headers.get("content-type") || "image/jpeg";
      } else {
        console.warn("[covers] kyobo placeholder detected; falling back to Kakao. isbn:", isbn);
      }
    }
  } catch (e) {
    console.error("[covers] kyobo fetch error:", (e as Error)?.message);
  }

  // 3) Kakao fallback
  if (!bytes) {
    try {
      const kb = await kakaoLookupByIsbn(isbn);
      const kakaoUrl = kb?.thumbnail;
      if (kakaoUrl) {
        const r = await fetch(kakaoUrl, { cache: "no-store" });
        if (r.ok && r.headers.get("content-type")?.startsWith("image/")) {
          bytes = new Uint8Array(await r.arrayBuffer());
          contentType = r.headers.get("content-type") || "image/jpeg";
        }
      }
    } catch (e) {
      console.error("[covers] kakao fetch error:", (e as Error)?.message);
    }
  }

  // 4) Nothing usable
  if (!bytes) return new NextResponse(null, { status: 404 });

  // 5) Store real cover in Supabase (skip placeholders)
  try {
    const blob = new Blob([bytes], { type: contentType });
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, blob, { contentType, upsert: true });
    if (error) {
      console.error("[covers] storage.upload error:", error.message);
    } else {
      console.log(`[covers] uploaded ${key} (${bytes.length} bytes)`);
    }
  } catch (e) {
    console.error("[covers] storage.upload exception:", (e as Error)?.message);
  }

  // 6) Serve
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
    },
  });
}
