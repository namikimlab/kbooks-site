import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const serverOptions = {
  global: {
    headers: {
      "X-Client-Info": "kbooks-server",
    },
  },
} as const;

export function createSupabaseServerClient() {
  return createServerComponentClient({
    cookies,
  });
}

export function createSupabaseRouteHandlerClient() {
  return createRouteHandlerClient({
    cookies,
  });
}
