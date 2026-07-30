/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { pool } from "../config/database";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let i = 0; i < 10000; i += 1) {
      await client.query(
        "INSERT INTO users (email, name) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
        [`user${i}@example.com`, `User ${i}`]
      );
      await client.query(
        "INSERT INTO products (sku, name, stock_quantity, price) VALUES ($1, $2, $3, $4) ON CONFLICT (sku) DO NOTHING",
        [`SKU-${i}`, `Product ${i}`, 1000, 9.99]
      );
    }

    await client.query("COMMIT");
    console.log("Seeded 10,000 products and users");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
