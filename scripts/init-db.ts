import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
const envFiles = ['.env.local', '.env.production', '.env'];
for (const file of envFiles) {
    dotenv.config({ path: path.join(__dirname, '..', file) });
}

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function initDb() {
    const client = await pool.connect();
    try {
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        const schemaSql = await fs.readFile(schemaPath, 'utf-8');

        console.log('Executing schema.sql...');
        await client.query(schemaSql);
        console.log('Database initialized successfully.');
    } catch (err) {
        console.error('Failed to initialize database:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

initDb();
