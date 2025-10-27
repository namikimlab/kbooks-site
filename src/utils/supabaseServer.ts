import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export function getServerSupabase() {
  // This wraps the cookie store so Supabase can read the session
  return createServerComponentClient({ cookies });
}
