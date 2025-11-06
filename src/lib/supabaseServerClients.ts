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

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerComponentClient({
    cookies: () => cookieStore,
    options: serverOptions,
  });
}

export function createSupabaseRouteHandlerClient() {
  return createRouteHandlerClient({
    cookies,
    options: serverOptions,
  });
}
