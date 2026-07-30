import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/database';
import { redis } from '../src/config/redis';
import { reserveStock } from '../src/services/inventoryService';

test('concurrent reservations do not oversell (N callers, stock = N-1)', async () => {
  const client = await pool.connect();
  const sku = `TEST-SKU-${Date.now()}`;
  try {
    await client.query('BEGIN');
    const insert = await client.query(
      "INSERT INTO products (sku, name, stock_quantity, reserved_quantity, price) VALUES ($1, $2, $3, 0, $4) RETURNING id",
      [sku, 'Concurrency Test Product', 9, 9.99]
    );
    const productId = insert.rows[0].id;
    await client.query('COMMIT');

    // keep Redis in sync with initial available count (stock - reserved = 9)
    const inventoryKey = `inventory:${productId}:available`;
    await redis.set(inventoryKey, '9');

    const N = 10;
    const attempts = [] as Promise<boolean>[];
    for (let i = 0; i < N; i += 1) {
      const orderId = `order-${Date.now()}-${i}`;
      attempts.push(reserveStock(productId, 1, orderId, 'test-user-concurrent'));
    }

    const results = await Promise.all(attempts);
    const successCount = results.filter(Boolean).length;
    assert.equal(successCount, 9);

    // cleanup
    await client.query('BEGIN');
    await client.query('DELETE FROM order_items WHERE order_id LIKE $1', ['order-%']);
    await client.query('DELETE FROM orders WHERE id LIKE $1', ['order-%']);
    await client.query('DELETE FROM products WHERE sku = $1', [sku]);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
});
