import pg from "pg";

const { Pool } = pg;

// PostgreSQL connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,

  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Handle database errors
pool.on("error", (error) => {
  console.error("[DATABASE ERROR]", error.message);
});

// Initialize database tables
export async function initializeDatabase() {
  // 1. Bot Users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_users (
      telegram_id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT NOT NULL DEFAULT 'Unknown',
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // 2. Bot Admins
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_admins (
      telegram_id TEXT PRIMARY KEY,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // 3. Free Fire Accounts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ff_accounts (
      telegram_id TEXT PRIMARY KEY,
      ff_uid TEXT NOT NULL,
      access_token TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Index for finding recently active users
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bot_users_last_seen
    ON bot_users(last_seen)
  `);

  console.log("Database initialized successfully.");
}
