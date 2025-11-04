// lib/storage.supabase.ts
import type { CoverStore } from "./storage";
import { createSupabaseServiceRoleClient } from "./supabaseClients";

const supabase = createSupabaseServiceRoleClient();
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
