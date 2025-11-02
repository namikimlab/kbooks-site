// app/api/thumbs/[isbn]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kakaoLookupByIsbn } from "@/lib/kakaoSearch";

// --- assumptions (adjust if your key scheme differs) ---
// - Large image in Supabase bucket at: book-covers/{isbn}.jpg
// - Placeholder available at: /placeholder-cover.jpg in /public
// -------------------------------------------------------

const BUCKET = "book-covers";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

export async function GET(
  req: Request,
  ctx: { params: Promise<{ isbn: string }> } // Next 15: params is async
) {
  const { isbn: rawIsbn } = await ctx.params;
  const isbn = rawIsbn?.trim();
  if (!isbn) return NextResponse.json({ error: "Missing ISBN" }, { status: 400 });

  const key = `${isbn}.jpg`;

  // 1) Try Supabase (large cover already cached there)
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
    console.error("[thumbs] storage.download error:", (e as Error)?.message);
    // continue to Kakao
  }

  // 2) Kakao (Daum) thumbnail only; do NOT upload anywhere
  try {
    const kb = await kakaoLookupByIsbn(isbn);
    const kakaoUrl = kb?.thumbnail; // e.g. 120x174
    if (kakaoUrl) {
      const r = await fetch(kakaoUrl, { cache: "no-store" });
      const ct = r.headers.get("content-type") || "";
      if (r.ok && ct.startsWith("image/")) {
        const ab = await r.arrayBuffer();
        return new NextResponse(Buffer.from(ab), {
          headers: {
            "Content-Type": ct,
            "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
          },
        });
      }
    }
  } catch (e) {
    console.error("[thumbs] kakao fetch error:", (e as Error)?.message);
    // continue to placeholder
  }

  // 3) FINAL FALLBACK: return placeholder BYTES (no fs, no redirect)
  const origin = new URL(req.url).origin; // works in dev & prod
  const ph = await fetch(`${origin}/placeholder-cover.jpg`, { cache: "force-cache" });
  if (ph.ok) {
    const ab = await ph.arrayBuffer();
    return new NextResponse(Buffer.from(ab), {
      headers: {
        "Content-Type": ph.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Last-resort valid image (1x1 transparent PNG) to avoid "received null"
  const transparentPng =
    Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,120,156,99,0,1,0,0,5,0,1,13,10,44,179,0,0,0,0,73,69,78,68,174,66,96,130]);
  return new NextResponse(Buffer.from(transparentPng), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
