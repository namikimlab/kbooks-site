import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabaseServerClients";

async function handle(request: Request) {
  const supabase = createSupabaseRouteHandlerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}

export const POST = handle;
export const GET = handle;
