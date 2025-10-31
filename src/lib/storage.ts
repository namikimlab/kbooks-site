// lib/storage.ts
export interface CoverStore {
  download(key: string): Promise<Uint8Array | null>; // null if missing
  upload(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
}
