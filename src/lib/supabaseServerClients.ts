import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerComponentClient({
    cookies: async () => cookieStore,
  });
}

export async function createSupabaseRouteHandlerClient() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({
    cookies: async () => cookieStore,
  });
}
