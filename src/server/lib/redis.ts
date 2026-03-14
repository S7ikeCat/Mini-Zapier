import type { ConnectionOptions } from "bullmq";

let cachedRedisConnection: ConnectionOptions | null = null;

export function getRedisConnection(): ConnectionOptions {
  if (cachedRedisConnection) {
    return cachedRedisConnection;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is not set");
  }

  const parsed = new URL(redisUrl);
  const port = Number(parsed.port || 6379);
  const isTls = parsed.protocol === "rediss:";

  cachedRedisConnection = {
    host: parsed.hostname,
    port,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
    ...(isTls ? { tls: {} } : {}),
  };

  return cachedRedisConnection;
}