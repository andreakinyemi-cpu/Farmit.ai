import { redis } from "./redis";

export async function rateLimit(key: string, limit: number, windowSec: number) {
  if (!redis) {
    return { ok: true, remaining: limit, degraded: true };
  }

  const now = Math.floor(Date.now() / 1000);
  const bucket = `${key}:${Math.floor(now / windowSec)}`;

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }

    const count = await redis.incr(bucket);
    if (count === 1) await redis.expire(bucket, windowSec);

    return { ok: count <= limit, remaining: Math.max(0, limit - count), degraded: false };
  } catch {
    return { ok: true, remaining: limit, degraded: true };
  }
}
