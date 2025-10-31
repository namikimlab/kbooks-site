// app/api/thumbs/[isbn]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kakaoLookupByIsbn } from "@/lib/kakaoSearch";

const BUCKET = "book-covers"; 
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

export async function GET(
  _req: Request,
  { params }: { params: { isbn: string } }
) {
  const isbn = params.isbn?.trim();
  if (!isbn) return NextResponse.json({ error: "Missing ISBN" }, { status: 400 });

  const key = `${isbn}.jpg`;

  // 1) Try Supabase cache first
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
  }

  // 2) Kakao (Daum) only for thumbnails
  let bytes: Uint8Array | null = null;
  let contentType = "image/jpeg";

  try {
    const kb = await kakaoLookupByIsbn(isbn);
    const kakaoUrl = kb?.thumbnail; // e.g. 120x174
    if (kakaoUrl) {
      const r = await fetch(kakaoUrl, { cache: "no-store" });
      if (r.ok && r.headers.get("content-type")?.startsWith("image/")) {
        const ab = await r.arrayBuffer();
        bytes = new Uint8Array(ab);
        contentType = r.headers.get("content-type") || "image/jpeg";
      }
    }
  } catch (e) {
    console.error("[thumbs] kakao fetch error:", (e as Error)?.message);
  }

  if (!bytes) return new NextResponse(null, { status: 404 });

  // 3) Upload to Supabase for next time
  try {
    const blob = new Blob([bytes], { type: contentType });
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, blob, { contentType, upsert: true });
    if (error) console.error("[thumbs] storage.upload error:", error.message);
  } catch (e) {
    console.error("[thumbs] storage.upload exception:", (e as Error)?.message);
  }

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
    },
  });
}
