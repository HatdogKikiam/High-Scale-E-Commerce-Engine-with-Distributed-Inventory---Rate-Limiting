import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const connectionString = process.env.DATABASE_URL ?? "postgresql://ecommerce:ecommerce@127.0.0.1:5432/ecommerce";

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on("connect", () => {
  console.info("PostgreSQL pool connected");
});

pool.on("error", (error: Error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

export async function query(text: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
