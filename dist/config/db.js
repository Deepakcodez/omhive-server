import "dotenv/config";
import pg from "pg";
const { Pool } = pg;
const requiredEnv = {
    user: process.env.DB_USER ?? process.env.USER,
    host: process.env.DB_HOST ?? process.env.HOST,
    database: process.env.DB_NAME ?? process.env.DATABASE,
    password: process.env.DB_PASSWORD ?? process.env.PASSWORD,
    port: process.env.DB_PORT ?? process.env.DBPORT,
};
for (const [key, value] of Object.entries(requiredEnv)) {
    if (!value) {
        throw new Error(`Missing database environment variable: ${key}`);
    }
}
export const pool = new Pool({
    user: requiredEnv.user,
    host: requiredEnv.host,
    database: requiredEnv.database,
    password: requiredEnv.password,
    port: Number(requiredEnv.port),
});
export const connectDB = async () => {
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
        console.log("DB connection established");
    }
    finally {
        client.release();
    }
};
