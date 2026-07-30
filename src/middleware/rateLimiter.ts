/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import type { NextFunction, Request, Response } from "express";
import { redis } from "../config/redis";
import { AppError } from "../utils/httpErrors";

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 200;
  const keyPrefix = options.keyPrefix ?? "rate-limit";

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const forwardedFor = req.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp = forwardedFor ?? req.ip ?? "unknown";
    const key = `${keyPrefix}:${clientIp}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    await redis.zremrangebyscore(key, 0, windowStart);
    const currentCount = await redis.zcard(key);

    if (currentCount >= maxRequests) {
      res.setHeader("X-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000).toString());
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    await redis.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
    await redis.expire(key, Math.ceil(windowMs / 1000));

      res.setHeader("X-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - currentCount - 1).toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000).toString());
      next();
    } catch (error) {
      next(error instanceof Error ? error : new AppError("Rate limiter failed", 500));
    }
  };
}
