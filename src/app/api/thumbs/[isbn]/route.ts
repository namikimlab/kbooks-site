// app/api/thumbs/[isbn]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { kakaoLookupByIsbn } from "@/lib/kakaoSearch";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRoleClient";

// --- assumptions (adjust if your key scheme differs) ---
// - Large image in Supabase bucket at: book-covers/{isbn}.jpg
// - Inline fallback renders “표지 없음” so every response is an image
// -------------------------------------------------------

const BUCKET = "book-covers";
const supabase = createSupabaseServiceRoleClient();

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

  // 3) FINAL FALLBACK: inline SVG placeholder with “표지 없음”
  const placeholderSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="174" viewBox="0 0 120 174">
      <rect width="120" height="174" rx="6" fill="#f4f4f5"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" fill="#a1a1aa">
        표지 없음
      </text>
    </svg>
  `;
  return new NextResponse(Buffer.from(placeholderSvg.trim()), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
