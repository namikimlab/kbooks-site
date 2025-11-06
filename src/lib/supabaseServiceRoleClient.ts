import { createClient } from "@supabase/supabase-js";
import { requireServerEnv } from "@/lib/env";

const SUPABASE_URL = requireServerEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireServerEnv("SUPABASE_SECRET_KEY");

let cachedClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseServiceRoleClient() {
  if (!cachedClient) {
    cachedClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            "X-Client-Info": "kbooks-service-role",
          },
        },
      }
    );
  }
  return cachedClient;
}
