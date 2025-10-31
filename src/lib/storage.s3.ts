// lib/storage.s3.ts
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { CoverStore } from "./storage";

const s3 = new S3Client({ region: process.env.AWS_REGION! });
const BUCKET = process.env.COVERS_BUCKET!;

export const s3Store: CoverStore = {
  async download(key) {
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const buf = await res.Body!.transformToByteArray();
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  },
  async upload(key, bytes, contentType) {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: "public, max-age=86400, s-maxage=2592000, immutable",
    }));
  },
};
