import Redis from "ioredis";

// This is being used only for local develomplent, while REDIS_URL for production deployment

export const REDIS = new Redis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
);
