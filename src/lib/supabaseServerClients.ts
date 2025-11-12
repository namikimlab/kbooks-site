import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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
