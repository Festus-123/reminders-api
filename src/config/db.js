import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon.tech") || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

async function getPgVersion() {
  try {
    const client = await pool.connect();
    const result = await client.query(`SELECT version()`);
    console.log("PostgreSQL Version:", result.rows[0].version);
    client.release();
  } catch (err) {
    console.error("Database Connection Failure:", err.message);
  }
}

// Call inside a safe block or remove top-level invocation in production
if (process.env.NODE_ENV !== "production") {
  getPgVersion();
}

export default pool;