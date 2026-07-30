/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { pool } from "../config/database";
import { redis } from "../config/redis";
import { AppError } from "../utils/httpErrors";

export async function refundOrder(orderId: string) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const orderResult = await client.query("SELECT id, status FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
    if (orderResult.rowCount === 0) {
      await client.query("ROLLBACK");
      throw new AppError("Order not found", 404);
    }

    const order = orderResult.rows[0];
    if (order.status !== "paid") {
      await client.query("ROLLBACK");
      throw new AppError("Only paid orders can be refunded", 409);
    }

    const itemsResult = await client.query("SELECT product_id, quantity FROM order_items WHERE order_id = $1", [orderId]);
    const redisUpdated: Array<{ productId: string; qty: number }> = [];
    for (const item of itemsResult.rows) {
      await client.query(
        "UPDATE products SET stock_quantity = stock_quantity + $1, reserved_quantity = GREATEST(reserved_quantity - $1, 0), updated_at = NOW() WHERE id = $2",
        [item.quantity, item.product_id]
      );
      try {
        await redis.incrby(`inventory:${item.product_id}:available`, item.quantity);
        redisUpdated.push({ productId: item.product_id, qty: item.quantity });
      } catch (err) {
        // Attempt to revert any previously applied Redis increments
        for (const applied of redisUpdated) {
          try {
            await redis.decrby(`inventory:${applied.productId}:available`, applied.qty);
          } catch (/* swallow */) {
            // best-effort revert
          }
        }
        await client.query("ROLLBACK");
        throw err;
      }
    }

    await client.query("UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = $1", [orderId]);
    await client.query("COMMIT");
    return { ok: true, orderId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
