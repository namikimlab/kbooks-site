import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

type ServerClientOptions = Parameters<typeof createServerComponentClient>[0];
type RouteClientOptions = Parameters<typeof createRouteHandlerClient>[0];

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerComponentClient({
    cookies: () => cookieStore,
  } as unknown as ServerClientOptions);
}

export async function createSupabaseRouteHandlerClient() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({
    cookies: () => cookieStore,
  } as unknown as RouteClientOptions);
}
