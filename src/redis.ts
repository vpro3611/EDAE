import Redis from "ioredis";

const DEFAULT_REDIS_URL = "redis://localhost:6379";

export function getRedisUrl(): string {
  return process.env.REDIS_URL ?? DEFAULT_REDIS_URL;
}

export function getRedisConnectionOptions() {
  const redisUrl = new URL(getRedisUrl());
  const dbPath = redisUrl.pathname.replace("/", "");

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    ...(redisUrl.username
      ? { username: decodeURIComponent(redisUrl.username) }
      : {}),
    ...(redisUrl.password
      ? { password: decodeURIComponent(redisUrl.password) }
      : {}),
    ...(dbPath ? { db: Number(dbPath) } : {}),
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

export const REDIS = new Redis(getRedisUrl());
