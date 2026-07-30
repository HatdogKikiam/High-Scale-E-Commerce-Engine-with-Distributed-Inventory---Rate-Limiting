/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { Worker, Queue } from "bullmq";
import { pool } from "../config/database";
import { redis } from "../config/redis";

export const orderExpirationQueue = new Queue("order-expiration", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000
    }
  }
});

export const orderExpirationWorker = new Worker(
  "order-expiration",
  async (job) => {
    const { orderId } = job.data as { orderId: string };
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const orderResult = await client.query("SELECT id, status FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
      if (orderResult.rowCount === 0) {
        await client.query("COMMIT");
        return { status: "not-found" };
      }

      const order = orderResult.rows[0];
      if (order.status !== "pending") {
        await client.query("COMMIT");
        return { status: "skipped" };
      }

      const itemsResult = await client.query("SELECT product_id, quantity FROM order_items WHERE order_id = $1", [orderId]);
      for (const item of itemsResult.rows) {
        await client.query(
          "UPDATE products SET stock_quantity = stock_quantity + $1, reserved_quantity = GREATEST(reserved_quantity - $1, 0), updated_at = NOW() WHERE id = $2",
          [item.quantity, item.product_id]
        );
        await redis.incrby(`inventory:${item.product_id}:available`, item.quantity);
      }

      await client.query("UPDATE orders SET status = 'expired', updated_at = NOW() WHERE id = $1", [orderId]);
      await client.query("COMMIT");
      return { status: "expired" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  {
    connection: redis,
    autorun: true
  }
);

orderExpirationWorker.on("completed", (job) => {
  console.info(`Order expiration completed for order ${job.data.orderId}`);
});

orderExpirationWorker.on("failed", async (job, error) => {
  console.error(`Order expiration failed for order ${job?.data.orderId}`, error);
  if (job) {
    await orderExpirationQueue.add("dead-letter", { orderId: job.data.orderId, error: error.message }, { removeOnComplete: true });
  }
});

export async function enqueueOrderExpiration(orderId: string, delayMs = 15 * 60 * 1000) {
  await orderExpirationQueue.add(
    "expire-order",
    { orderId },
    {
      delay: delayMs,
      removeOnComplete: true,
      removeOnFail: true
    }
  );
}
