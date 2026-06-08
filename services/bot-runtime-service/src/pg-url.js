// src/pg-url.js
// Resolve a Node/pg connection string. Prefer DATABASE_URL; otherwise build it from
// the Java-style DB_URL (jdbc) + DB_USERNAME + DB_PASSWORD that the other services
// already carry in the shared .env — so no extra secret is needed in prod.

function resolveDatabaseUrl() {
  const direct = (process.env.DATABASE_URL || '').trim();
  if (direct) return direct;

  const jdbc = (process.env.DB_URL || '').trim();
  const m = jdbc.match(/^jdbc:postgresql:\/\/([^/?]+)\/([^?]+)/i);
  if (!m) return '';
  const hostPort = m[1]; // host:port
  const db = m[2]; // postgres
  const user = encodeURIComponent(process.env.DB_USERNAME || '');
  const pass = encodeURIComponent(process.env.DB_PASSWORD || '');
  return `postgresql://${user}:${pass}@${hostPort}/${db}`;
}

module.exports = { resolveDatabaseUrl };
