// lib/isbn.ts
const onlyDigits = (s: string) => s.replace(/[^0-9Xx]/g, "").toUpperCase();

export function splitKakaoIsbn(isbnField: string | null | undefined) {
  if (!isbnField) return { isbn10: null, isbn13: null };
  const parts = isbnField.split(" ").map(onlyDigits).filter(Boolean);

  // pick candidates
  const isbn10 = parts.find(p => p.length === 10) ?? null;
  const isbn13 = parts.find(p => p.length === 13) ?? null;

  return { isbn10, isbn13 };
}

// Optional validators (lightweight)
export function isValidIsbn13(s: string) {
  const v = onlyDigits(s);
  if (v.length !== 13) return false;
  const sum = [...v.slice(0, 12)].reduce((acc, ch, i) => acc + (+ch) * (i % 2 ? 3 : 1), 0);
  const check = (10 - (sum % 10)) % 10;
  return check === +v[12];
}

export function isValidIsbn10(s: string) {
  const v = onlyDigits(s);
  if (v.length !== 10) return false;
  const sum = [...v.slice(0, 9)].reduce((acc, ch, i) => acc + (+ch) * (10 - i), 0);
  const check = (11 - (sum % 11)) % 11;
  const last = v[9] === "X" ? 10 : +v[9];
  return check === last;
}

// Convert ISBN10 → ISBN13 (prefix 978)
export function toIsbn13(isbn10: string) {
  const core = onlyDigits(isbn10).slice(0, 9); // drop ISBN10 check digit
  const base = "978" + core;
  const sum = [...base].reduce((acc, ch, i) => acc + (+ch) * (i % 2 ? 3 : 1), 0);
  const check = (10 - (sum % 10)) % 10;
  return base + String(check);
}
