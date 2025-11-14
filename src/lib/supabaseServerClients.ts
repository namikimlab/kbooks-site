import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerComponentClient({
    cookies: async () => cookieStore,
  });
}

export function createSupabaseRouteHandlerClient() {
  const cookieStore = cookies();
  return createRouteHandlerClient({
    cookies: async () => cookieStore,
  });
}
