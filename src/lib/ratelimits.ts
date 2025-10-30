import { redis } from "@/lib/redis";

export async function rateLimit(ip: string, limit = 60, windowSec = 60) {
  const key = `rl:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const tx = redis.multi();
  tx.zremrangebyscore(key, 0, now - windowSec);
  tx.zadd(key, { score: now, member: `${now}:${Math.random()}` });
  tx.zcard(key);
  tx.expire(key, windowSec);
  const [, , count] = await tx.exec<[unknown, unknown, number, unknown]>();
  return { allowed: (count ?? 0) <= limit, count: count ?? 0 };
}
