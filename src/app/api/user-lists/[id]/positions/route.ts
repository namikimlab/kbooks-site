import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabaseServerClients";

type RouteParams = {
  params: {
    id: string;
  };
};

type PositionsPayload = {
  positions?: Array<{ isbn13?: unknown; position?: unknown }>;
};

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[list-positions] failed to fetch auth user", authError);
  }

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 404 });
  }

  const {
    data: list,
    error: listError,
  } = await supabase
    .from("user_list")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle<{ id: string; user_id: string }>();

  if (listError) {
    console.error("[list-positions] failed to read user_list", listError);
    return NextResponse.json({ error: "리스트를 찾을 수 없어요." }, { status: 500 });
  }

  if (!list || list.user_id !== user.id) {
    return NextResponse.json({ error: "리스트를 수정할 권한이 없어요." }, { status: 403 });
  }

  let payload: PositionsPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  if (!Array.isArray(payload.positions) || payload.positions.length === 0) {
    return NextResponse.json({ error: "변경할 순서를 전달해주세요." }, { status: 422 });
  }

  const normalized = payload.positions
    .map(item => {
      const isbn13 = typeof item.isbn13 === "string" ? item.isbn13 : null;
      const positionNumber = Number(item.position);
      const position =
        Number.isInteger(positionNumber) && positionNumber > 0 ? positionNumber : null;
      if (!isbn13 || position === null) return null;
      return { isbn13, position };
    })
    .filter(Boolean) as Array<{ isbn13: string; position: number }>;

  if (normalized.length === 0) {
    return NextResponse.json({ error: "올바른 순서 값을 전달해주세요." }, { status: 422 });
  }

  const {
    data: membershipRows,
    error: membershipError,
  } = await supabase
    .from("user_list_book")
    .select("isbn13")
    .eq("list_id", id);

  if (membershipError) {
    console.error("[list-positions] failed to read membership rows", membershipError);
    return NextResponse.json({ error: "리스트 정보를 불러오지 못했어요." }, { status: 500 });
  }

  const validIsbnSet = new Set((membershipRows ?? []).map(row => row.isbn13));
  const updates = normalized.filter(item => validIsbnSet.has(item.isbn13));

  if (updates.length === 0) {
    return NextResponse.json({ error: "변경할 책을 찾을 수 없어요." }, { status: 404 });
  }

  const { error: clearError } = await supabase
    .from("user_list_book")
    .update({ position: null })
    .eq("list_id", id);

  if (clearError) {
    console.error("[list-positions] failed to clear existing positions", clearError);
    return NextResponse.json({ error: "순서를 저장하지 못했어요." }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("user_list_book")
    .upsert(
      updates.map(item => ({
        list_id: id,
        isbn13: item.isbn13,
        position: item.position,
      })),
      { onConflict: "list_id,isbn13" }
    );

  if (updateError) {
    console.error("[list-positions] failed to update positions", updateError);
    return NextResponse.json({ error: "순서를 저장하지 못했어요." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
