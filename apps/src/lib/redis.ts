import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

export const redis =
  redisUrl && redisUrl.length > 0
    ? new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
    : null;

if (redis) {
  redis.on("error", () => {
    // Intentionally swallow to avoid unhandled error noise when Redis is unavailable.
  });
}
