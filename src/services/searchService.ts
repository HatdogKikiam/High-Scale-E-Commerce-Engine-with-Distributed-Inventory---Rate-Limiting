/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { pool } from "../config/database";

export interface CatalogSearchResult {
  id: string;
  sku: string;
  name: string;
  price: string;
}

export async function searchCatalog(query: string): Promise<CatalogSearchResult[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, sku, name, price FROM products WHERE LOWER(name) LIKE LOWER($1) OR LOWER(sku) LIKE LOWER($1) ORDER BY name ASC LIMIT 20",
      [`%${query}%`]
    );
    return result.rows;
  } finally {
    client.release();
  }
}
