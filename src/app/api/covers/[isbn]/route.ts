// app/api/covers/[isbn]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kakaoLookupByIsbn } from "@/lib/kakaoSearch";

const BUCKET = "book-covers";

// ✅ Supabase service-role client (server-side only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET(
  _req: Request,
  { params }: { params: { isbn: string } }
) {
  const isbn = params.isbn?.trim();
  if (!isbn) {
    return NextResponse.json({ error: "Missing ISBN" }, { status: 400 });
  }

  const key = `${isbn}.jpg`;

  // 1️⃣ Try Supabase Storage first
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(key);
    if (data && !error) {
      const buf = Buffer.from(await data.arrayBuffer());
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
        },
      });
    }
  } catch (err) {
    // If file not found, continue to next step
  }

  // 2️⃣ Try Kyobo CDN
  const kyoboUrl = `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn}.jpg`;
  let buffer: Buffer | null = null;
  let contentType = "image/jpeg";

  try {
    const kyoboRes = await fetch(kyoboUrl);
    if (kyoboRes.ok && kyoboRes.headers.get("content-type")?.startsWith("image")) {
      buffer = Buffer.from(await kyoboRes.arrayBuffer());
      contentType = kyoboRes.headers.get("content-type") || "image/jpeg";
    }
  } catch (err) {
    // network errors ignored
  }

  // 3️⃣ Fallback to Kakao if Kyobo not found
  if (!buffer) {
    const kb = await kakaoLookupByIsbn(isbn);
    const kakaoUrl = kb?.thumbnail;
    if (kakaoUrl) {
      const kakaoRes = await fetch(kakaoUrl);
      if (kakaoRes.ok && kakaoRes.headers.get("content-type")?.startsWith("image")) {
        buffer = Buffer.from(await kakaoRes.arrayBuffer());
        contentType = kakaoRes.headers.get("content-type") || "image/jpeg";
      }
    }
  }

  // 4️⃣ If still missing, return 404
  if (!buffer) {
    return new NextResponse(null, { status: 404 });
  }

  // 5️⃣ Upload to Supabase for next time (cached)
  try {
    await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType, upsert: true });
  } catch (err) {
    // ignore upload failure; not fatal
  }

  // 6️⃣ Return response (with Cache-Control)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      // ✅ Cache-Control: browser 1 day, CDN 30 days
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
    },
  });
}
