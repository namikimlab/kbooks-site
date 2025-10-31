// lib/supabase.stateless.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Stateless Supabase client
 * - No cookie or session persistence
 * - Safe for server routes & public pages
 */
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
