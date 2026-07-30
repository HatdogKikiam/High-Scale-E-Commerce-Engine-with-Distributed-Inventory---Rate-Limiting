/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { pool } from "../config/database";

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Migrations initialized");
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
