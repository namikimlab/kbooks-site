import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabaseServerClients";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateListPayload = {
  title?: unknown;
  description?: unknown;
  visibility?: unknown;
};

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const supabase = createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[user-lists:get] failed to fetch auth user", authError);
  }

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 404 });
  }

  const { data: list, error } = await supabase
    .from("user_list")
    .select("id, title, description, is_public, updated_at, user_id")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      title: string;
      description: string | null;
      is_public: boolean | null;
      updated_at: string | null;
      user_id: string;
    }>();

  if (error) {
    console.error(`[user-lists:get] failed to fetch list id=${id}`, error);
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 500 });
  }

  if (!list) {
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 404 });
  }

  if (list.user_id !== user.id) {
    return NextResponse.json({ error: "리스트를 수정할 권한이 없어요." }, { status: 403 });
  }

  return NextResponse.json({
    id: list.id,
    title: list.title,
    description: list.description,
    visibility: list.is_public ? "public" : "private",
    updatedAt: list.updated_at,
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const supabase = createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[user-lists:patch] failed to fetch auth user", authError);
  }

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 404 });
  }

  let payload: UpdateListPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("user_list")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle<{ id: string; user_id: string }>();

  if (existingError) {
    console.error(`[user-lists:patch] failed to fetch list id=${id}`, existingError);
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "리스트를 수정할 권한이 없어요." }, { status: 403 });
  }

  const nextTitle =
    typeof payload.title === "string" ? payload.title.trim() : undefined;
  const descriptionProvided =
    typeof payload.description === "string" || payload.description === null;
  const normalizedDescription =
    typeof payload.description === "string"
      ? payload.description.trim()
      : payload.description;

  let isPublic: boolean | undefined;
  if (payload.visibility === "public") {
    isPublic = true;
  } else if (payload.visibility === "private") {
    isPublic = false;
  } else if (typeof payload.visibility === "boolean") {
    isPublic = payload.visibility;
  }

  if (nextTitle !== undefined && !nextTitle) {
    return NextResponse.json({ error: "리스트 제목을 입력해주세요." }, { status: 422 });
  }

  const updates: Record<string, unknown> = {};

  if (nextTitle !== undefined) {
    updates.title = nextTitle;
  }

  if (descriptionProvided) {
    const safeDescription =
      typeof normalizedDescription === "string"
        ? normalizedDescription.trim()
        : "";
    updates.description = safeDescription.length > 0 ? safeDescription : null;
  }

  if (typeof isPublic === "boolean") {
    updates.is_public = isPublic;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없어요." }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("user_list")
    .update(updates)
    .eq("id", id)
    .select("id, title, description, is_public, updated_at")
    .single<{
      id: string;
      title: string;
      description: string | null;
      is_public: boolean | null;
      updated_at: string | null;
    }>();

  if (error) {
    console.error(`[user-lists:patch] failed to update list id=${id}`, error);
    return NextResponse.json({ error: "리스트를 수정하지 못했어요." }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    title: data.title,
    description: data.description,
    visibility: data.is_public ? "public" : "private",
    updatedAt: data.updated_at,
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const supabase = createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[user-lists:delete] failed to fetch auth user", authError);
  }

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 404 });
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("user_list")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle<{ id: string; user_id: string }>();

  if (existingError) {
    console.error(`[user-lists:delete] failed to fetch list id=${id}`, existingError);
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "리스트를 삭제할 권한이 없어요." }, { status: 403 });
  }

  const { error: membershipDeleteError } = await supabase
    .from("user_list_book")
    .delete()
    .eq("list_id", id);

  if (membershipDeleteError) {
    console.error(`[user-lists:delete] failed to remove list memberships id=${id}`, membershipDeleteError);
    return NextResponse.json({ error: "리스트를 삭제하지 못했어요." }, { status: 500 });
  }

  const { error: deleteError } = await supabase.from("user_list").delete().eq("id", id);

  if (deleteError) {
    console.error(`[user-lists:delete] failed to delete list id=${id}`, deleteError);
    return NextResponse.json({ error: "리스트를 삭제하지 못했어요." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
