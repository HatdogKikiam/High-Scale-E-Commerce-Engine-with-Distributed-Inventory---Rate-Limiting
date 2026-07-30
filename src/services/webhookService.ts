/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import crypto from "crypto";
import { pool } from "../config/database";
import { AppError } from "../utils/httpErrors";

export interface StripeWebhookPayload {
  type?: string;
  data?: {
    object?: {
      metadata?: Record<string, string>;
      orderId?: string;
      id?: string;
    };
  };
  orderId?: string;
}

export function verifyStripeSignature(payload: string, signature: string | undefined, secret: string) {
  if (!signature) {
    throw new AppError("Missing Stripe signature", 400);
  }

  const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  const received = signature.replace("sha256=", "");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))) {
    throw new AppError("Invalid Stripe signature", 401);
  }
}

export async function processStripeWebhook(eventId: string, payload: StripeWebhookPayload, requestHash: string) {
  if (!eventId || !requestHash) {
    throw new AppError("Webhook event ID and request hash are required", 400);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT event_id, status FROM idempotency_keys WHERE event_id = $1 FOR UPDATE",
      [eventId]
    );

    if (existing.rowCount && existing.rows[0].status === "processed") {
      await client.query("COMMIT");
      return { idempotent: true, status: "processed" };
    }

    await client.query(
      "INSERT INTO idempotency_keys (event_id, request_hash, status) VALUES ($1, $2, 'processing') ON CONFLICT (event_id) DO UPDATE SET request_hash = EXCLUDED.request_hash",
      [eventId, requestHash]
    );

    const orderId = payload?.data?.object?.metadata?.orderId ?? payload?.data?.object?.orderId ?? payload?.orderId;
    if (orderId) {
      await client.query("UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = $1", [orderId]);
    }

    await client.query(
      "UPDATE idempotency_keys SET status = 'processed', processed_at = NOW() WHERE event_id = $1",
      [eventId]
    );

    await client.query("COMMIT");
    return { idempotent: false, status: "processed" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
