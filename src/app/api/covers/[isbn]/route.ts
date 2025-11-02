// app/api/covers/[isbn]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const BUCKET = "book-covers";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

// --- Kyobo placeholder: HASH-ONLY ---
const KYOBO_PLACEHOLDER_SHA256 = new Set<string>([
  "9a7d8d19a70d6b6011b74850b98f18228e8a97bfb673e0268fa2ab8ce54f1690",
]);

const sha256Hex = (u8: Uint8Array) =>
  crypto.createHash("sha256").update(u8).digest("hex");

function isKyoboPlaceholderHashOnly(bytes: Uint8Array): { yes: boolean; reason: string } {
  const hash = sha256Hex(bytes);
  if (KYOBO_PLACEHOLDER_SHA256.has(hash)) {
    return { yes: true, reason: `sha256:${hash}` };
  }
  return { yes: false, reason: "none" };
}

async function servePlaceholderBytes(req: Request) {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/placeholder-cover.jpg`, { cache: "force-cache" });
  if (r.ok) {
    const ab = await r.arrayBuffer();
    return new NextResponse(Buffer.from(ab), {
      headers: {
        "Content-Type": r.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Image-Source": "placeholder",
      },
    });
  }
  // last resort 1x1 PNG
  const tiny = Uint8Array.from([
    137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,
    0,0,0,13,73,68,65,84,120,156,99,0,1,0,0,5,0,1,13,10,44,179,0,0,0,0,73,69,78,68,174,66,96,130
  ]);
  return new NextResponse(Buffer.from(tiny), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      "X-Image-Source": "placeholder-transparent",
    },
  });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ isbn: string }> } // Next 15: await params
) {
  const { isbn: rawIsbn } = await ctx.params;
  const isbn = rawIsbn?.trim();
  if (!isbn) return NextResponse.json({ error: "Missing ISBN" }, { status: 400 });

  const key = `${isbn}.jpg`;

  // 1) Supabase cache
  try {
    const { data } = await supabase.storage.from(BUCKET).download(key);
    if (data) {
      const buf = Buffer.from(await data.arrayBuffer());
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
          "X-Image-Source": "supabase",
        },
      });
    }
  } catch (e) {
    console.error("[covers] storage.download error:", (e as Error)?.message);
  }

  // 2) Kyobo large
  try {
    const kyoboUrl = `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn}.jpg`;
    const r = await fetch(kyoboUrl, { cache: "no-store" });

    const ct = r.headers.get("content-type") || "";
    const cl = r.headers.get("content-length") || "unknown";

    if (r.ok && ct.startsWith("image/")) {
      const u8 = new Uint8Array(await r.arrayBuffer());
      const hash = sha256Hex(u8);
      const { yes, reason } = isKyoboPlaceholderHashOnly(u8);

      console.log(
        `[covers] kyobo ${isbn} ct=${ct} len=${u8.byteLength} hash=${hash} placeholder=${yes} reason=${reason}`
      );

      if (yes) {
        // Placeholder -> serve app placeholder (DO NOT upload)
        const ph = await servePlaceholderBytes(req);
        // ASCII-only header values (no arrows or non-ASCII)
        ph.headers.set("X-Image-Source", "kyobo-placeholder-to-app-placeholder");
        ph.headers.set("X-Placeholder-Reason", reason);
        ph.headers.set("X-Kyobo-Bytes", String(u8.byteLength));
        ph.headers.set("X-Kyobo-Hash", hash);
        return ph;
      }

      // Real cover -> upload then serve
      try {
        const blob = new Blob([u8], { type: ct || "image/jpeg" });
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(key, blob, { contentType: ct || "image/jpeg", upsert: true });
        if (error) {
          console.error("[covers] storage.upload error:", error.message);
        } else {
          console.log(`[covers] uploaded to Supabase: ${key} (${u8.byteLength} bytes)`);
        }
      } catch (e) {
        console.error("[covers] storage.upload exception:", (e as Error)?.message);
      }

      return new NextResponse(Buffer.from(u8), {
        headers: {
          "Content-Type": ct || "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
          "X-Image-Source": "kyobo",
          "X-Kyobo-Content-Length": cl,
          "X-Kyobo-Bytes": String(u8.byteLength),
          "X-Kyobo-Hash": hash,
        },
      });
    } else {
      console.warn(`[covers] kyobo miss ${isbn} status=${r.status} ct=${ct}`);
    }
  } catch (e) {
    console.error("[covers] kyobo fetch error:", (e as Error)?.message);
  }

  // 3) Fallback -> app placeholder
  const ph = await servePlaceholderBytes(req);
  ph.headers.set("X-Image-Source", "fallback-placeholder");
  return ph;
}
