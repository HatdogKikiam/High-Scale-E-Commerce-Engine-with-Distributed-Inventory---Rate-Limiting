/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { redis } from "../config/redis";

export interface FaultState {
  injectLatencyMs: number;
  dropRedis: boolean;
  failWebhook: boolean;
}

export const faultState: FaultState = {
  injectLatencyMs: 0,
  dropRedis: false,
  failWebhook: false
};

export async function applyFaultInjection<T>(operation: () => Promise<T>): Promise<T> {
  if (faultState.injectLatencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, faultState.injectLatencyMs));
  }

  if (faultState.dropRedis) {
    throw new Error("Simulated Redis outage");
  }

  return operation();
}

export async function setFaultState(next: Partial<FaultState>) {
  Object.assign(faultState, next);
  return faultState;
}

export async function getFaultState() {
  return faultState;
}

export async function simulateRedisDrop() {
  await redis.set("fault:redis:drop", "1");
}
