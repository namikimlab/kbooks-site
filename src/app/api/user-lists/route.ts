import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabaseServerClients";

type CreateListPayload = {
  title?: unknown;
  description?: unknown;
  visibility?: unknown;
};

export async function POST(req: Request) {
  const supabase = createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[user-lists] failed to fetch auth user", authError);
  }

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  let payload: CreateListPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const title =
    typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "리스트 제목을 입력해주세요." }, { status: 422 });
  }

  const descriptionInput =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const normalizedDescription = descriptionInput.length > 0 ? descriptionInput : null;

  let isPublic = true;
  if (payload.visibility === "private") {
    isPublic = false;
  } else if (payload.visibility === "public") {
    isPublic = true;
  } else if (typeof payload.visibility === "boolean") {
    isPublic = payload.visibility;
  }

  const { data, error } = await supabase
    .from("user_lists")
    .insert({
      user_id: user.id,
      title,
      description: normalizedDescription,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    console.error("[user-lists] failed to insert row", error);
    return NextResponse.json({ error: "리스트를 만들지 못했어요." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
