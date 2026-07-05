// src/db.js
// Single pg pool to Supabase (service_role / direct connection).

const { Pool } = require('pg');
const { resolveDatabaseUrl } = require('./pg-url');

const ssl = process.env.DB_SSL_NO_VERIFY === 'true' ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
  ssl,
  max: Number(process.env.DB_POOL_MAX_SIZE) || 3,
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS) || 30_000,
  connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS) || 5_000,
});

pool.on('error', (err) => console.error('[runtime] pg pool error:', err.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
