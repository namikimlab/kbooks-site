// lib/storage.supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { CoverStore } from "./storage";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY! // server-only
);
const BUCKET = "book-covers";

export const supabaseStore: CoverStore = {
  async download(key) {
    const { data, error } = await supabase.storage.from(BUCKET).download(key);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  },
  async upload(key, bytes, contentType) {
    await supabase.storage.from(BUCKET).upload(key, bytes, {
      contentType, upsert: true,
    });
  },
};
