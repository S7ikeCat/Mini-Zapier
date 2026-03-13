const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not set");
}

const parsed = new URL(redisUrl);

const port = Number(parsed.port || 6379);
const isTls = parsed.protocol === "rediss:";

export const redisConnection = {
  host: parsed.hostname,
  port,
  username: parsed.username || undefined,
  password: parsed.password || undefined,
  maxRetriesPerRequest: null as null,
  ...(isTls ? { tls: {} } : {}),
};


// import IORedis from "ioredis";

// const redisUrl = process.env.REDIS_URL;

// if (!redisUrl) {
//   throw new Error("REDIS_URL is not set");
// }

// export const redisConnection = new IORedis(redisUrl, {
//   maxRetriesPerRequest: null,
// });


// export const redisConnection = {
//   host: process.env.REDIS_HOST ?? "127.0.0.1",
//   port: Number(process.env.REDIS_PORT ?? 6379),
//   maxRetriesPerRequest: null,
// };