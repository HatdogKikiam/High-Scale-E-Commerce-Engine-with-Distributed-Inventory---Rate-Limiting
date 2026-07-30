/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { createRateLimiter } from "./middleware/rateLimiter";
import { reserveStock } from "./services/inventoryService";
import { processStripeWebhook } from "./services/webhookService";
import { enqueueOrderExpiration } from "./workers/orderExpirationWorker";
import { AppError, isAppError } from "./utils/httpErrors";
import { logger } from "./config/logger";
import { metricsMiddleware } from "./observability/metrics";
import { createTraceId, withTrace } from "./observability/tracing";
import { validateBody, reserveSchema, webhookSchema } from "./middleware/validation";
import { setFaultState, getFaultState, applyFaultInjection } from "./resilience/faultInjection";
import { getCachedProduct, setCachedProduct } from "./services/cacheService";
import { redis } from "./config/redis";

interface RequestWithTrace extends Request {
  traceId?: string;
}

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "High-Scale E-Commerce Engine",
      version: "1.0.0"
    }
  },
  apis: ["./src/app.ts"]
});

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(hpp());
app.use(express.json());
app.use(metricsMiddleware);
app.use((req: RequestWithTrace, _res, next) => {
  const traceHeader = req.headers["x-trace-id"];
  req.traceId = Array.isArray(traceHeader) ? traceHeader[0] : traceHeader ?? createTraceId();
  next();
});
app.use(createRateLimiter({ windowMs: 60_000, maxRequests: 250 }));

app.get("/metrics", async (_req, res) => {
  const { register } = await import("prom-client");
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.static("public"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/status", async (_req, res) => {
  res.json({ faultState: await getFaultState(), redisHealthy: await redis.ping() });
});

app.post("/admin/faults", async (req, res) => {
  const state = await setFaultState(req.body);
  res.json(state);
});

app.get("/catalog/:productId", async (req, res, next) => {
  try {
    const product = await getCachedProduct(req.params.productId);
    if (product) {
      return res.json(product);
    }

    const fallback = { id: req.params.productId, name: "Sample Product", price: 19.99 };
    await setCachedProduct(req.params.productId, fallback, 60);
    return res.json(fallback);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /products/{productId}/reserve:
 *   post:
 *     summary: Reserve inventory for an order
 *     responses:
 *       201:
 *         description: Reservation created
 */
app.post("/products/:productId/reserve", validateBody(reserveSchema), async (req: RequestWithTrace, res, next) => {
  try {
    const { quantity, orderId } = req.body as { quantity: number; orderId: string };

    await withTrace(req, async () => {
      logger.info({ traceId: req.traceId, orderId, quantity }, "Processing inventory reservation");

      const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
      const reserved = await applyFaultInjection(async () => reserveStock(productId, quantity, orderId));
      if (!reserved) {
        throw new AppError("Insufficient stock", 409);
      }

      await enqueueOrderExpiration(orderId);
      return res.status(201).json({ ok: true, orderId });
    });
  } catch (error) {
    next(error);
  }
});

app.post("/webhooks/stripe", validateBody(webhookSchema), async (req: RequestWithTrace, res, next) => {
  try {
    const eventId = req.header("Stripe-Signature") ?? "default-event";
    if (!eventId) {
      throw new AppError("Missing Stripe signature", 400);
    }

    logger.info({ traceId: req.traceId, eventId }, "Handling Stripe webhook");
    const result = await processStripeWebhook(eventId, req.body, JSON.stringify(req.body));
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.use((err: unknown, req: RequestWithTrace, res: Response, _next: NextFunction) => {
  logger.error({ traceId: req.traceId, err }, "Unhandled application error");

  if (isAppError(err)) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof Error) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }

  return res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.info(`Server listening on port ${port}`);
});

export default app;
