import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config();

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on("connect", () => {
  console.info("Redis client connected");
});

redis.on("error", (error: Error) => {
  console.error("Redis connection error", error);
});
