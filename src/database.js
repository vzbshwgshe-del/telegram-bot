import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
});

export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_users (
      telegram_id BIGINT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      first_seen TIMESTAMPTZ DEFAULT NOW(),
      last_seen TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_admins (
      telegram_id BIGINT PRIMARY KEY,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      added_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log("✅ PostgreSQL database initialized");
}
