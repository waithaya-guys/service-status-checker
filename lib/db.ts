import { Pool } from 'pg';

let pool: Pool;

function getPool() {
    if (!pool) {
        const isProduction = process.env.NODE_ENV === 'production';
        const isLocalhost = process.env.DATABASE_URL?.includes('localhost') ||
            process.env.DATABASE_URL?.includes('127.0.0.1') ||
            process.env.DATABASE_URL?.includes('host.docker.internal');

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: (false) ? { rejectUnauthorized: false } : undefined,
        });
    }
    return pool;
}

export async function query(text: string, params?: any[]) {
    const start = Date.now();
    const pool = getPool();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        // console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Error executing query', { text, error });
        throw error;
    }
}

export async function getClient() {
    const pool = getPool();
    const client = await pool.connect();
    return client;
}
