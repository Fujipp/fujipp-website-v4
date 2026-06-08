// src/lib/db.js
// Postgres pool to the shop schema (Supabase). Used by the wallet-topup feature.
// DATABASE_URL is injected by the orchestrator at start.

const { Pool } = require('pg');

const ssl = process.env.DB_SSL_NO_VERIFY === 'true' ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: 3,
});

pool.on('error', (err) => console.error('[central-bot] pg pool error:', err.message));

module.exports = { pool, query: (text, params) => pool.query(text, params) };
