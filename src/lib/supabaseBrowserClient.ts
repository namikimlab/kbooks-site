import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const browserOptions = {
  global: {
    headers: {
      "X-Client-Info": "kbooks-browser",
    },
  },
} as const;

export function createSupabaseBrowserClient() {
  return createClientComponentClient({
    options: browserOptions,
  });
}
