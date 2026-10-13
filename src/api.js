import express from "express";
import {
  randomBytes,
  createHash,
  timingSafeEqual
} from "node:crypto";
import { pool } from "./database.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

const PORT = Number(process.env.API_PORT || 3000);
const ADMIN_SECRET = process.env.API_ADMIN_SECRET;

if (!ADMIN_SECRET || ADMIN_SECRET.length < 32) {
  throw new Error("API_ADMIN_SECRET must contain at least 32 characters.");
}

function hashKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

function verifySecret(supplied) {
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_SECRET);

  return a.length === b.length && timingSafeEqual(a, b);
}

async function initializeApiDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id BIGSERIAL PRIMARY KEY,
      key_hash TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL DEFAULT 'default',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    )
  `);
}

function requireApiKey(req, res, next) {
  const key = req.get("x-api-key") || "";

  if (!/^ff_[a-f0-9]{64}$/.test(key)) {
    return res.status(401).json({
      success: false,
      error: "Invalid API key"
    });
  }

  req.apiKey = key;
  next();
}

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "FF ALL IN ONE API"
  });
});

app.post("/admin/keys", async (req, res) => {
  if (!verifySecret(req.get("x-admin-secret") || "")) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized"
    });
  }

  try {
    const apiKey = "ff_" + randomBytes(32).toString("hex");
    const label = String(req.body?.label || "default").slice(0, 60);

    await pool.query(
      `INSERT INTO api_keys (key_hash, label) VALUES ($1, $2)`,
      [hashKey(apiKey), label]
    );

    res.status(201).json({
      success: true,
      api_key: apiKey,
      warning: "Save this key securely. It cannot be retrieved again."
    });
  } catch (error) {
    console.error("API key creation failed:", error.message);

    res.status(500).json({
      success: false,
      error: "Could not create API key"
    });
  }
});

app.post("/admin/keys/:id/revoke", async (req, res) => {
  if (!verifySecret(req.get("x-admin-secret") || "")) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized"
    });
  }

  try {
    const result = await pool.query(
      `UPDATE api_keys
       SET revoked_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL
       RETURNING id`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Active API key not found"
      });
    }

    res.json({
      success: true,
      message: "API key revoked"
    });
  } catch (error) {
    console.error("API key revocation failed:", error.message);

    res.status(500).json({
      success: false,
      error: "Could not revoke API key"
    });
  }
});

app.get("/v1/status", requireApiKey, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id FROM api_keys
       WHERE key_hash = $1 AND revoked_at IS NULL`,
      [hashKey(req.apiKey)]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid or revoked API key"
      });
    }

    res.json({
      success: true,
      service: "FF ALL IN ONE API",
      message: "API key accepted"
    });
  } catch (error) {
    console.error("API verification failed:", error.message);

    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

export async function startApi() {
  await initializeApiDatabase();

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`FF ALL IN ONE API listening on port ${PORT}`);
      resolve(server);
    });

    server.once("error", reject);
  });
                         }
