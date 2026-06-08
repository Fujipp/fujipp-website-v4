// src/db.js
// Single pg pool to Supabase (service_role / direct connection).

const { Pool } = require('pg');

const ssl = process.env.DB_SSL_NO_VERIFY === 'true' ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: 5,
});

pool.on('error', (err) => console.error('[runtime] pg pool error:', err.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
