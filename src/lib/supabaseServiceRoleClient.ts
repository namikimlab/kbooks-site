import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

let cachedClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseServiceRoleClient() {
  if (!cachedClient) {
    cachedClient = createClient(
      SUPABASE_URL,
      requireEnv(SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SECRET_KEY"),
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
