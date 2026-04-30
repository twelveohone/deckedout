import cors from "cors";
import express from "express";
import { Pool } from "pg";

const app = express();
const port = Number(process.env.PORT) || 3000;

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: corsOrigin === "*" || !corsOrigin ? true : corsOrigin.split(",").map((s) => s.trim()),
  })
);
app.use(express.json());

function dbPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const ssl =
    process.env.NODE_ENV === "production" || connectionString.includes("render.com")
      ? { rejectUnauthorized: false }
      : false;
  return new Pool({ connectionString, ssl });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "decked-out-api" });
});

app.get("/health/db", async (_req, res) => {
  const pool = dbPool();
  try {
    const r = await pool.query("SELECT 1 AS n");
    res.json({ ok: true, db: r.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  } finally {
    await pool.end();
  }
});

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set (required before auth routes are added)");
}

app.listen(port, "0.0.0.0", () => {
  console.log(`listening on 0.0.0.0:${port}`);
});
