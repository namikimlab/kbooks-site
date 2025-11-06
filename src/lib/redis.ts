import { Redis } from "@upstash/redis";
import { requireServerEnv } from "@/lib/env";

export const redis = new Redis({
  url: requireServerEnv("UPSTASH_REDIS_REST_URL"),
  token: requireServerEnv("UPSTASH_REDIS_REST_TOKEN"),
});
