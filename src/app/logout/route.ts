import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabaseClients";

export async function POST(request: Request) {
  const supabase = createSupabaseRouteHandlerClient();

  // Invalidate the current session
  await supabase.auth.signOut();

  // After logout, go back to home
  return NextResponse.redirect(new URL("/", request.url));
}
