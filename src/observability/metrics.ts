/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import prometheus from "prom-client";

prometheus.collectDefaultMetrics();

export const httpRequestDuration = new prometheus.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in milliseconds",
  labelNames: ["method", "route", "status"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000]
});

export const inventoryReservations = new prometheus.Counter({
  name: "inventory_reservations_total",
  help: "Total inventory reservation attempts",
  labelNames: ["status"]
});

export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  res.on("finish", () => {
    httpRequestDuration.observe({ method: req.method, route: req.route?.path ?? req.path, status: res.statusCode }, Date.now() - start);
  });
  next();
}
