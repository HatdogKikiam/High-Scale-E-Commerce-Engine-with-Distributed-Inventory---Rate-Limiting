/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { pool } from "../config/database";

export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export async function enqueueOutboxEvent(event: OutboxEvent) {
  const client = await pool.connect();
  try {
    await client.query(
      "INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload) VALUES ($1, $2, $3, $4, $5)",
      [event.id, event.aggregateType, event.aggregateId, event.eventType, JSON.stringify(event.payload)]
    );
  } finally {
    client.release();
  }
}

export async function listPendingOutboxEvents() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, aggregate_type, aggregate_id, event_type, payload FROM outbox_events WHERE processed_at IS NULL ORDER BY created_at ASC"
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function markOutboxEventProcessed(id: string) {
  const client = await pool.connect();
  try {
    await client.query("UPDATE outbox_events SET processed_at = NOW() WHERE id = $1", [id]);
  } finally {
    client.release();
  }
}
