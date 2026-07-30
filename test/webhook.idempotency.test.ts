import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/database';
import { processStripeWebhook } from '../src/services/webhookService';

test('processStripeWebhook is idempotent for the same eventId', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderInsert = await client.query("INSERT INTO orders (user_id, status, total_amount) VALUES ($1, $2, $3) RETURNING id", ['test-user', 'pending', 10]);
    const orderId = orderInsert.rows[0].id;

    const eventId = `evt-${Date.now()}`;
    const payload = { data: { object: { metadata: { orderId } } } } as any;
    const requestHash = JSON.stringify(payload);

    const first = await processStripeWebhook(eventId, payload, requestHash);
    assert.equal(first.idempotent, false);

    const second = await processStripeWebhook(eventId, payload, requestHash);
    assert.equal(second.idempotent, true);

    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
});
