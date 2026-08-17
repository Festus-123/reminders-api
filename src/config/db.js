import pg from "pg";

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

async function getPgVersion() {
    const client = await pool.connect();

    try {
        const result = await client.query(`SELECT version()`);
        console.log(result.rows[0]);
    } finally {
        client.release();
    }
}

getPgVersion();

export default pool;