/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { pool } from "../config/database";
import { redis } from "../config/redis";
import { AppError } from "../utils/httpErrors";

const reserveStockLua = `
local key = KEYS[1]
local quantity = tonumber(ARGV[1])
if quantity <= 0 then
  return 0
end
local available = tonumber(redis.call("GET", key) or "0")
if available < quantity then
  return 0
end
redis.call("DECRBY", key, quantity)
return 1
`;

export async function reserveStock(productId: string, quantity: number, orderId: string): Promise<boolean> {
  if (!productId || !orderId) {
    throw new AppError("Product ID and order ID are required", 400);
  }

  const inventoryKey = `inventory:${productId}:available`;
  const result = await redis.eval(reserveStockLua, 1, inventoryKey, quantity.toString());

  if (Number(result) !== 1) {
    return false;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentProduct = await client.query(
      "SELECT id, stock_quantity, reserved_quantity FROM products WHERE id = $1 FOR UPDATE",
      [productId]
    );

    if (currentProduct.rowCount === 0) {
      await client.query("ROLLBACK");
      await redis.incrby(inventoryKey, quantity);
      return false;
    }

    const available = Number(currentProduct.rows[0].stock_quantity) - Number(currentProduct.rows[0].reserved_quantity);
    if (available < quantity) {
      await client.query("ROLLBACK");
      await redis.incrby(inventoryKey, quantity);
      return false;
    }

    await client.query(
      "UPDATE products SET stock_quantity = stock_quantity - $1, reserved_quantity = reserved_quantity + $1, updated_at = NOW() WHERE id = $2",
      [quantity, productId]
    );

    await client.query(
      "INSERT INTO orders (id, user_id, status, total_amount, expires_at) VALUES ($1, $2, 'pending', 0, NOW() + INTERVAL '15 minutes')",
      [orderId, "00000000-0000-0000-0000-000000000001"]
    );

    await client.query(
      "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, 0)",
      [orderId, productId, quantity]
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    await redis.incrby(inventoryKey, quantity);
    throw error;
  } finally {
    client.release();
  }
}
