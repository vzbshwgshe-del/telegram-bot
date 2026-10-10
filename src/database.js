import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

pool.on("error", (error) => {
  console.error("[DATABASE ERROR]", error.message);
});

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_users (
      telegram_id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT NOT NULL DEFAULT 'Unknown',
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_admins (
      telegram_id TEXT PRIMARY KEY,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bot_users_last_seen
    ON bot_users(last_seen)
  `);

  console.log("Database initialized successfully.");
}
