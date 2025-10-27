import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  // Invalidate the current session
  await supabase.auth.signOut();

  // After logout, go back to home
  return NextResponse.redirect(new URL("/", request.url));
}
