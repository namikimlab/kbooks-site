import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabaseServerClients";

export async function GET(request: Request) {
  const supabase = createSupabaseRouteHandlerClient();

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const destination = profile ? "/" : "/onboarding";
  return NextResponse.redirect(new URL(destination, request.url));
}
