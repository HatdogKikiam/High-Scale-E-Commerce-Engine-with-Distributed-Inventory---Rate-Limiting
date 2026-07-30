/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import CircuitBreaker from "opossum";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CircuitBreakerFn = (...args: any[]) => Promise<any>;

export function createCircuitBreaker<T extends CircuitBreakerFn>(fn: T) {
  return new CircuitBreaker(fn, {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10
  });
}
