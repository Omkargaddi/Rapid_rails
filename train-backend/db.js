import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
});

pool.on('error', (err) => {
    console.error('[PG] Idle client error:', err.message);
});

export async function initDb() {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('[PG] Database ready');
}

export const query = (text, params) => pool.query(text, params);

export default pool;
