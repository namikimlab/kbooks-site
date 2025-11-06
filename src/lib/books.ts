import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRoleClient";

const supabase = createSupabaseServiceRoleClient();

export interface BookRow {
  isbn13: string;
  title: string | null;
  author: string | null;
  publisher: string | null;
  publish_date: string | null;
  description: string | null;
  kyobo_url: string | null;
  category: string[] | null;
  kakao_fetched_at: string | null;
  kyobo_fetched_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface KakaoBookUpsertPayload {
  title: string | null;
  authors: string[];
  publisher: string | null;
  publishDate: string | null;
  description: string | null;
}

export interface KyoboCategoryPayload {
  kyoboUrl: string | null;
  categories: string[] | null;
}

export type KyoboRawPayload = Record<string, unknown>;

const nowIso = () => new Date().toISOString();
const DAY_MS = 86_400_000;

export async function getBookByIsbn13(isbn13: string) {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("isbn13", isbn13)
    .maybeSingle<BookRow>();

  if (error) throw error;
  return data;
}

export async function ensureBookStub(isbn13: string) {
  const existing = await getBookByIsbn13(isbn13);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("books")
    .insert({ isbn13 })
    .select()
    .single<BookRow>();

  if (error) throw error;
  return data;
}

export async function upsertKakaoBook(isbn13: string, payload: KakaoBookUpsertPayload | null) {
  const update = payload
    ? {
        isbn13,
        title: payload.title,
        author: payload.authors.join(", ") || null,
        publisher: payload.publisher,
        publish_date: payload.publishDate,
        description: payload.description,
        kakao_fetched_at: nowIso(),
        updated_at: nowIso(),
      }
    : {
        isbn13,
        kakao_fetched_at: nowIso(),
        updated_at: nowIso(),
      };

  const { data, error } = await supabase
    .from("books")
    .upsert(update, { onConflict: "isbn13" })
    .select()
    .single<BookRow>();

  if (error) throw error;
  return data;
}

export async function updateKyoboCategory(isbn13: string, payload: KyoboCategoryPayload) {
  const updatePayload: Record<string, unknown> = {
    isbn13,
    updated_at: nowIso(),
  };

  if (payload.kyoboUrl) updatePayload.kyobo_url = payload.kyoboUrl;
  if (payload.categories && payload.categories.length > 0) {
    updatePayload.category = payload.categories;
    updatePayload.kyobo_fetched_at = nowIso();
  }

  const query = supabase.from("books").upsert(updatePayload, {
    onConflict: "isbn13",
  });

  const { data, error } = await query.select().single<BookRow>();
  if (error) throw error;
  return data;
}

export async function upsertKyoboRawPayload(isbn13: string, raw: KyoboRawPayload, scrapedAt?: string) {
  const { error } = await supabase
    .from("books_kyobo_raw")
    .upsert(
      {
        isbn13,
        payload: raw,
        scraped_at: scrapedAt ?? nowIso(),
      },
      { onConflict: "isbn13" }
    );

  if (error) throw error;
}

export async function markKyoboFetchAttempt(isbn13: string) {
  const { error } = await supabase
    .from("books")
    .update({ kyobo_fetched_at: nowIso(), updated_at: nowIso() })
    .eq("isbn13", isbn13);

  if (error) throw error;
}

export function needsKakaoEnrichment(book: BookRow | null) {
  if (!book) return true;
  if (!book.kakao_fetched_at) return true;

  const fields = [book.title, book.author, book.publisher, book.description];
  return fields.some(v => !v);
}

export function shouldFetchKyoboCategory(book: BookRow | null, now = Date.now()) {
  if (!book) return true;

  const noCategory = !book.category || book.category.length === 0;
  const noFetchedAt = !book.kyobo_fetched_at;
  
  if (noCategory || noFetchedAt) return true;

  const fetchedAt = Date.parse(book.kyobo_fetched_at);
  if (Number.isNaN(fetchedAt)) return true;

  return now - fetchedAt > DAY_MS;
}

export async function upsertKyoboUrlOnly(isbn13: string, kyoboUrl: string) {
  const { data, error } = await supabase
    .from("books")
    .upsert(
      {
        isbn13,
        kyobo_url: kyoboUrl,
        updated_at: nowIso(),
      },
      { onConflict: "isbn13" }
    )
    .select()
    .single<BookRow>();

  if (error) throw error;
  return data;
}
