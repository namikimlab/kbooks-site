import { createClient } from "@supabase/supabase-js";
import {
  createClientComponentClient,
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { createBrowserClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

/**
 * For Client Components / browser-only hooks.
 * Wraps the auth helper to ensure session persistence works with Next.js.
 */
export function createSupabaseBrowserClient() {
  return createClientComponentClient({
    options: {
      global: {
        headers: {
          "X-Client-Info": "kbooks-browser",
        },
      },
    },
  });
}

/**
 * For server components (RSC). Shares cookies to keep the auth session in sync.
 */
export function createSupabaseServerClient() {
  return createServerComponentClient({
    cookies,
    options: {
      global: {
        headers: {
          "X-Client-Info": "kbooks-rsc",
        },
      },
    },
  });
}

/**
 * For Next.js Route Handlers that need to respect the user's auth session.
 */
export function createSupabaseRouteHandlerClient() {
  return createRouteHandlerClient({
    cookies,
    options: {
      global: {
        headers: {
          "X-Client-Info": "kbooks-route-handler",
        },
      },
    },
  });
}

/**
 * For server-only tasks that require elevated privileges (e.g. storage uploads).
 * Never import this into client bundles.
 */
export function createSupabaseServiceRoleClient() {
  return createClient(
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

/**
 * For edge cases where you need a manual browser client without the auth helper.
 * Prefer {@link createSupabaseBrowserClient} for most usages.
 */
export function createStatelessSupabaseClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "X-Client-Info": "kbooks-stateless",
      },
    },
  });
}
