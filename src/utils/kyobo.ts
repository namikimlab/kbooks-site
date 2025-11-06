// utils/kyobo.ts
const KYOOBO_AUTOCOMPLETE_URL =
  "https://search.kyobobook.co.kr/srp/api/v1/search/autocomplete/shop";
const KYOOBO_PRODUCT_URL_PREFIX = "https://product.kyobobook.co.kr/detail/";

type KyoboAutocompleteDocument = {
  CMDTCODE?: string;    // ISBN13
  SALE_CMDTID?: string; // e.g., "S000217503188"
};
type KyoboAutocompletePayload = {
  data?: { resultDocuments?: KyoboAutocompleteDocument[] };
};

// Accept ANY JSONP callback name like cb(...), autocompleteShop(...), etc.
function parseJsonpAny(body: string): KyoboAutocompletePayload | null {
  const m = (body ?? "").trim().match(/^[A-Za-z_$][\w$]*\s*\((.*)\)\s*;?\s*$/s);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/**
 * Resolve Kyobo product URL from ISBN13 using the autocomplete JSONP.
 * Logs SALE_CMDTID and returns:
 *   https://product.kyobobook.co.kr/detail/<SALE_CMDTID>
 * Returns null if not found.
 */
export async function getKyoboProductUrlFromIsbn(
  isbn13: string,
  fetchWithTimeout: (url: string, method: "GET" | "HEAD") => Promise<Response | null>,
): Promise<string | null> {
  if (!isbn13) return null;

  const qs = new URLSearchParams({ callback: "cb", keyword: isbn13 });
  const endpoint = `${KYOOBO_AUTOCOMPLETE_URL}?${qs.toString()}`;

  const res = await fetchWithTimeout(endpoint, "GET");
  if (!res || !res.ok) {
    console.warn("[kyobo] autocomplete request failed", { isbn13, status: res?.status });
    return null;
  }

  const txt = await res.text();
  const parsed = parseJsonpAny(txt);
  const docs = parsed?.data?.resultDocuments ?? [];
  if (!docs.length) {
    console.warn("[kyobo] no resultDocuments", { isbn13 });
    return null;
  }

  // Prefer exact ISBN match; otherwise use the first document
  const doc =
    docs.find(d => (d.CMDTCODE || "").trim() === isbn13) ??
    docs[0];

  const saleCmdtid = doc?.SALE_CMDTID?.trim();
  console.log("[kyobo] SALE_CMDTID:", saleCmdtid, "for ISBN:", isbn13);

  if (!saleCmdtid) return null;

  // Only ever return URL using SALE_CMDTID (never ISBN-shaped)
  return `${KYOOBO_PRODUCT_URL_PREFIX}${saleCmdtid}`;
}
