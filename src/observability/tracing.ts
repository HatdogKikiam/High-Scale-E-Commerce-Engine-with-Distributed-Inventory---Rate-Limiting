/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { context, propagation, trace } from "@opentelemetry/api";

export function getTraceContext(req: any) {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

export function createTraceId() {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function withTrace(req: any, handler: () => Promise<any>) {
  const traceId = req.headers["x-trace-id"] ?? createTraceId();
  req.traceId = traceId;
  return handler();
}
