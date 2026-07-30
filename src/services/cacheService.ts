/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { redis } from "../config/redis";

export async function getCachedProduct(productId: string) {
  const cached = await redis.get(`catalog:${productId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  return null;
}

export async function setCachedProduct(productId: string, value: unknown, ttlSeconds = 60) {
  await redis.set(`catalog:${productId}`, JSON.stringify(value), "EX", ttlSeconds);
}

export async function warmCache(productId: string, value: unknown) {
  await setCachedProduct(productId, value, 120);
}
