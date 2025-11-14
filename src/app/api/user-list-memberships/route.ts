import { NextResponse } from "next/server";

import { MAX_BOOKS_PER_LIST } from "@/constants/lists";
import { ensureBookStub } from "@/lib/books";
import { createSupabaseRouteHandlerClient } from "@/lib/supabaseServerClients";

type MembershipPayload = {
  isbn13?: unknown;
  nextIds?: unknown;
  previousIds?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[list-memberships] failed to fetch auth user", authError);
  }

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  let payload: MembershipPayload;
  try {
    payload = (await request.json()) as MembershipPayload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식이에요." }, { status: 400 });
  }

  const rawIsbn = typeof payload.isbn13 === "string" ? payload.isbn13.trim() : "";
  if (!rawIsbn) {
    return NextResponse.json({ error: "ISBN이 필요해요." }, { status: 422 });
  }

  if (!Array.isArray(payload.nextIds) || !Array.isArray(payload.previousIds)) {
    return NextResponse.json({ error: "리스트 정보가 잘못됐어요." }, { status: 422 });
  }

  const cleanNext = payload.nextIds.filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  const cleanPrev = payload.previousIds.filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );

  const combinedIds = Array.from(new Set([...cleanNext, ...cleanPrev]));
  if (combinedIds.length === 0) {
    return NextResponse.json({
      addedIds: [],
      removedIds: [],
      limitExceededIds: [],
    });
  }

  const { data: ownedRows, error: ownedError } = await supabase
    .from("user_list")
    .select("id")
    .in("id", combinedIds)
    .eq("user_id", user.id);

  if (ownedError) {
    console.error("[list-memberships] failed to validate ownership", ownedError);
    return NextResponse.json({ error: "리스트 정보를 불러오지 못했어요." }, { status: 500 });
  }

  const ownedSet = new Set((ownedRows ?? []).map(row => row.id));
  let toAdd = cleanNext.filter(id => ownedSet.has(id));
  const toRemove = cleanPrev.filter(id => ownedSet.has(id));

  if (toAdd.length === 0 && toRemove.length === 0) {
    return NextResponse.json({
      addedIds: [],
      removedIds: [],
      limitExceededIds: [],
    });
  }

  try {
    await ensureBookStub(rawIsbn);
  } catch (err) {
    console.error("[list-memberships] ensureBookStub failed", err);
  }

  let limitExceededIds: string[] = [];

  if (toAdd.length > 0) {
    const { data: countRows, error: countError } = await supabase
      .from("user_list_book")
      .select("list_id")
      .in("list_id", toAdd);

    if (countError) {
      console.error("[list-memberships] failed to fetch list counts", countError);
      return NextResponse.json({ error: "리스트 정보를 불러오지 못했어요." }, { status: 500 });
    }

    const countMap = new Map<string, number>();
    for (const row of countRows ?? []) {
      const listId = row.list_id as string | null;
      if (!listId) continue;
      countMap.set(listId, (countMap.get(listId) ?? 0) + 1);
    }

    const filteredAdds: string[] = [];
    const exceeded: string[] = [];

    for (const listId of toAdd) {
      const current = countMap.get(listId) ?? 0;
      if (current >= MAX_BOOKS_PER_LIST) {
        exceeded.push(listId);
        continue;
      }
      countMap.set(listId, current + 1);
      filteredAdds.push(listId);
    }

    toAdd = filteredAdds;
    limitExceededIds = exceeded;
  }

  if (toAdd.length === 0 && toRemove.length === 0) {
    return NextResponse.json({
      addedIds: [],
      removedIds: [],
      limitExceededIds,
    });
  }

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase
      .from("user_list_book")
      .upsert(
        toAdd.map(listId => ({
          list_id: listId,
          isbn13: rawIsbn,
        })),
        { onConflict: "list_id,isbn13" }
      );

    if (insertError) {
      console.error("[list-memberships] upsert failed", insertError);
      return NextResponse.json({ error: "리스트에 책을 추가하지 못했어요." }, { status: 500 });
    }
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("user_list_book")
      .delete()
      .eq("isbn13", rawIsbn)
      .in("list_id", toRemove);

    if (deleteError) {
      console.error("[list-memberships] delete failed", deleteError);
      return NextResponse.json({ error: "리스트에서 책을 제거하지 못했어요." }, { status: 500 });
    }
  }

  return NextResponse.json({
    addedIds: toAdd,
    removedIds: toRemove,
    limitExceededIds,
  });
}
