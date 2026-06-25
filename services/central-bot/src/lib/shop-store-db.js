// src/lib/shop-store-db.js
// Shop-data store router. DB-backed shop features read/write their data through a pool
// resolved here instead of importing lib/db.js directly.
//
// - order-management always uses the platform pool (our Supabase).
// - member-spending lets the bot choose its database: by default the platform pool, but
//   when its own config opts in — SPENDING_DB_USE_OWN=true AND a non-empty SPENDING_DB_URL
//   (injected as env by the orchestrator's buildEnv) — it points at the shop's own
//   Postgres/Neon instead. The choice lives on the member-spending feature, not a separate
//   add-on, and is resolved ONCE per process (config is injected as env at start, so a
//   change auto-restarts the bot).
//
// On a customer's fresh database the required tables are auto-created on first use
// (ensureBootstrapped); on ours that DDL is a no-op because the migrations already created
// them. Keep the bootstrap DDL in sync with supabase/migrations/*_create_shop_*.sql.

const { Pool } = require('pg');
const { pool: platformPool } = require('./db');

// member-spending's own-DB pool, memoised for the life of the process.
let spendingResolved = null;
function resolveSpendingPool() {
  if (spendingResolved) return spendingResolved;
  const useOwn = /^(1|true|yes|on)$/i.test(String(process.env.SPENDING_DB_USE_OWN || '').trim());
  const url = String(process.env.SPENDING_DB_URL || '').trim();
  if (useOwn && url) {
    const needsSsl = /sslmode=require/i.test(url) || /neon\.tech/i.test(url);
    const ownPool = new Pool({
      connectionString: url,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
      max: 2,
    });
    ownPool.on('error', (err) => console.error('[central-bot] member-spending own-DB pool error:', err.message));
    spendingResolved = { pool: ownPool, isOwn: true };
  } else {
    spendingResolved = { pool: platformPool, isOwn: false };
  }
  return spendingResolved;
}

// Create schema + tables if missing. Idempotent and memoised PER POOL (so each distinct
// database — ours and any customer DB — bootstraps once). On failure the entry is cleared
// so the next call can retry (e.g. a transient connect error).
const bootstrapState = new WeakMap(); // pool -> Promise
function ensureBootstrapped(pool) {
  let promise = bootstrapState.get(pool);
  if (!promise) {
    promise = (async () => {
      await pool.query('CREATE SCHEMA IF NOT EXISTS shop');
      await pool.query(`CREATE TABLE IF NOT EXISTS shop.order_counters (
        external_subject_id TEXT        NOT NULL,
        channel_id          TEXT        NOT NULL,
        order_count         INTEGER     NOT NULL DEFAULT 0,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT order_counters_pkey PRIMARY KEY (external_subject_id, channel_id)
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS shop.member_spending (
        external_subject_id TEXT        NOT NULL,
        member_discord_id   TEXT        NOT NULL,
        amount_satang       BIGINT      NOT NULL DEFAULT 0,
        tx_count            INTEGER     NOT NULL DEFAULT 0,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT member_spending_pkey PRIMARY KEY (external_subject_id, member_discord_id)
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS shop.shop_status_messages (
        external_subject_id TEXT        NOT NULL,
        channel_id          TEXT        NOT NULL,
        message_id          TEXT        NOT NULL,
        status              TEXT        NOT NULL,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT shop_status_messages_pkey PRIMARY KEY (external_subject_id, channel_id)
      )`);
    })().catch((err) => {
      bootstrapState.delete(pool);
      throw err;
    });
    bootstrapState.set(pool, promise);
  }
  return promise;
}

// Per-subject order counter store, scoped by external_subject_id + channel_id.
// order-management always uses our database.
function getOrderStore(subjectId) {
  const pool = platformPool;
  const isOwn = false;

  // Read the current count for a channel, or null if it has never been counted.
  async function peek(channelId) {
    await ensureBootstrapped(pool);
    const { rows } = await pool.query(
      `SELECT order_count FROM shop.order_counters
        WHERE external_subject_id = $1 AND channel_id = $2`,
      [subjectId, channelId],
    );
    return rows[0] ? Number(rows[0].order_count) : null;
  }

  // Bump the channel's counter and return the new value. The first time a channel is
  // seen (no row) it seeds order_count from initialCount — the channel's existing embed
  // count — so an onboarded shop continues from its real history; afterwards it just +1.
  // Done in one UPSERT so concurrent /order calls stay consistent.
  async function bumpAndGet(channelId, initialCount = 0) {
    await ensureBootstrapped(pool);
    const { rows } = await pool.query(
      `INSERT INTO shop.order_counters (external_subject_id, channel_id, order_count, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (external_subject_id, channel_id)
       DO UPDATE SET order_count = shop.order_counters.order_count + 1, updated_at = now()
       RETURNING order_count`,
      [subjectId, channelId, Math.max(0, Number(initialCount) || 0)],
    );
    return Number(rows[0].order_count);
  }

  return { peek, bumpAndGet, isOwnDb: isOwn };
}

// Per-subject manual member-spending store, scoped by external_subject_id +
// member_discord_id. All amounts are satang. Backs the member-spending feature, whose
// own config (SPENDING_DB_USE_OWN / SPENDING_DB_URL) decides which database it uses.
function getSpendingStore(subjectId) {
  const { pool, isOwn } = resolveSpendingPool();

  // Add a spend and bump the transaction count. Returns the new totals plus whether
  // this was the member's first ever entry (drives the welcome vs returning card).
  async function addAmount(memberId, deltaSatang) {
    await ensureBootstrapped(pool);
    const { rows } = await pool.query(
      `INSERT INTO shop.member_spending (external_subject_id, member_discord_id, amount_satang, tx_count, updated_at)
       VALUES ($1, $2, $3, 1, now())
       ON CONFLICT (external_subject_id, member_discord_id)
       DO UPDATE SET amount_satang = shop.member_spending.amount_satang + $3,
                     tx_count      = shop.member_spending.tx_count + 1,
                     updated_at    = now()
       RETURNING amount_satang, tx_count`,
      [subjectId, memberId, Math.max(0, Math.round(Number(deltaSatang) || 0))],
    );
    const txCount = Number(rows[0].tx_count);
    return { amountSatang: Number(rows[0].amount_satang), txCount, isFirst: txCount === 1 };
  }

  // Absolute set of total / count (admin "update" modal). Either field may be left
  // unchanged by passing null. Creates the row if missing.
  async function setAmounts(memberId, { amountSatang = null, txCount = null } = {}) {
    await ensureBootstrapped(pool);
    const { rows } = await pool.query(
      `INSERT INTO shop.member_spending (external_subject_id, member_discord_id, amount_satang, tx_count, updated_at)
       VALUES ($1, $2, COALESCE($3, 0), COALESCE($4, 0), now())
       ON CONFLICT (external_subject_id, member_discord_id)
       DO UPDATE SET amount_satang = COALESCE($3, shop.member_spending.amount_satang),
                     tx_count      = COALESCE($4, shop.member_spending.tx_count),
                     updated_at    = now()
       RETURNING amount_satang, tx_count`,
      [
        subjectId, memberId,
        amountSatang == null ? null : Math.max(0, Math.round(Number(amountSatang))),
        txCount == null ? null : Math.max(0, Math.round(Number(txCount))),
      ],
    );
    return { amountSatang: Number(rows[0].amount_satang), txCount: Number(rows[0].tx_count) };
  }

  async function get(memberId) {
    await ensureBootstrapped(pool);
    const { rows } = await pool.query(
      `SELECT amount_satang, tx_count FROM shop.member_spending
        WHERE external_subject_id = $1 AND member_discord_id = $2`,
      [subjectId, memberId],
    );
    if (!rows[0]) return null;
    return { amountSatang: Number(rows[0].amount_satang), txCount: Number(rows[0].tx_count) };
  }

  async function remove(memberId) {
    await ensureBootstrapped(pool);
    const { rowCount } = await pool.query(
      `DELETE FROM shop.member_spending
        WHERE external_subject_id = $1 AND member_discord_id = $2`,
      [subjectId, memberId],
    );
    return rowCount > 0;
  }

  // Highest spenders first (amount, then count, then id) — drives Top1/Top5 + /topup list.
  async function leaderboard(limit = 100) {
    await ensureBootstrapped(pool);
    const { rows } = await pool.query(
      `SELECT member_discord_id, amount_satang, tx_count
         FROM shop.member_spending
        WHERE external_subject_id = $1
        ORDER BY amount_satang DESC, tx_count DESC, member_discord_id ASC
        LIMIT $2`,
      [subjectId, Math.max(1, Math.min(1000, Number(limit) || 100))],
    );
    return rows.map((r) => ({
      memberId: r.member_discord_id,
      amountSatang: Number(r.amount_satang),
      txCount: Number(r.tx_count),
    }));
  }

  async function totals() {
    await ensureBootstrapped(pool);
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount_satang), 0) AS amount, COALESCE(SUM(tx_count), 0) AS count
         FROM shop.member_spending WHERE external_subject_id = $1`,
      [subjectId],
    );
    return { amountSatang: Number(rows[0].amount), txCount: Number(rows[0].count) };
  }

  return { addAmount, setAmounts, get, remove, leaderboard, totals, isOwnDb: isOwn };
}

// Per-subject shop-status announcement store, scoped by external_subject_id + channel_id.
// Remembers the message the bot last posted/edited in an announce channel so /status
// edits it in place instead of spamming. shop-status always uses our database.
function getStatusStore(subjectId) {
  const pool = platformPool;

  // The remembered announcement for a channel, or null if none.
  async function get(channelId) {
    await ensureBootstrapped(pool);
    const { rows } = await pool.query(
      `SELECT message_id, status FROM shop.shop_status_messages
        WHERE external_subject_id = $1 AND channel_id = $2`,
      [subjectId, channelId],
    );
    return rows[0] ? { messageId: rows[0].message_id, status: rows[0].status } : null;
  }

  // Remember (or update) the announcement message + last status for a channel.
  async function set(channelId, messageId, status) {
    await ensureBootstrapped(pool);
    await pool.query(
      `INSERT INTO shop.shop_status_messages (external_subject_id, channel_id, message_id, status, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (external_subject_id, channel_id)
       DO UPDATE SET message_id = $3, status = $4, updated_at = now()`,
      [subjectId, channelId, String(messageId), String(status)],
    );
  }

  return { get, set };
}

module.exports = { getOrderStore, getSpendingStore, getStatusStore };
