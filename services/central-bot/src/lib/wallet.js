// src/lib/wallet.js
// Shop wallet store (layer B) for one bot (subject). Balances + ledger live in the
// `shop` schema, scoped by external_subject_id + member_discord_id. All money is satang.

const { pool } = require('./db');

class InsufficientFundsError extends Error {
  constructor() {
    super('insufficient funds');
    this.code = 'INSUFFICIENT_FUNDS';
  }
}

function makeWallet(subjectId, lifecycle = null) {
  const balanceListeners = new Map();
  lifecycle?.register(() => balanceListeners.clear());

  function emitBalance(memberId, balanceSatang) {
    const listeners = balanceListeners.get(String(memberId));
    if (!listeners) return;
    for (const listener of listeners) {
      Promise.resolve(listener(balanceSatang)).catch(() => {});
    }
  }

  function subscribeBalance(memberId, listener, ttlMs = 14 * 60 * 1000) {
    const key = String(memberId);
    const listeners = balanceListeners.get(key) || new Set();
    listeners.add(listener);
    balanceListeners.set(key, listeners);

    let timer = null;
    const unsubscribe = () => {
      if (timer) {
        if (lifecycle) lifecycle.clearTimer(timer);
        else clearTimeout(timer);
        timer = null;
      }
      listeners.delete(listener);
      if (listeners.size === 0) balanceListeners.delete(key);
    };
    timer = lifecycle ? lifecycle.setTimeout(unsubscribe, ttlMs) : setTimeout(unsubscribe, ttlMs);
    timer.unref?.();
    return unsubscribe;
  }

  async function getBalance(memberId) {
    const { rows } = await pool.query(
      `SELECT balance_satang FROM shop.member_wallets
        WHERE external_subject_id = $1 AND member_discord_id = $2`,
      [subjectId, memberId],
    );
    return rows[0] ? Number(rows[0].balance_satang) : 0;
  }

  // Atomic credit (top-up / adjustment). Returns the new balance.
  async function credit(memberId, amountSatang, { type = 'TOPUP', reference = null, note = null } = {}) {
    if (amountSatang <= 0) throw new Error('amount must be positive');
    const countTopup = type === 'TOPUP' ? amountSatang : 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO shop.member_wallets (external_subject_id, member_discord_id, balance_satang, total_topup_satang)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (external_subject_id, member_discord_id)
         DO UPDATE SET balance_satang = shop.member_wallets.balance_satang + $3,
                       total_topup_satang = shop.member_wallets.total_topup_satang + $4
         RETURNING balance_satang`,
        [subjectId, memberId, amountSatang, countTopup],
      );
      const balanceAfter = Number(rows[0].balance_satang);
      await writeLedger(client, memberId, 'CREDIT', type, amountSatang, balanceAfter, reference, note);
      await client.query('COMMIT');
      emitBalance(memberId, balanceAfter);
      return balanceAfter;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // Refund exactly once for a stable reference. A concurrent retry that loses the
  // unique-index race rolls its entire wallet update back before returning.
  async function creditOnce(memberId, amountSatang, reference, { note = null } = {}) {
    if (!reference) throw new Error('reference is required');
    try {
      const balance = await credit(memberId, amountSatang, { type: 'REFUND', reference, note });
      return { balance, credited: true };
    } catch (err) {
      if (err.code !== '23505') throw err;
      return { balance: await getBalance(memberId), credited: false };
    }
  }

  // Atomic debit (e.g. Robux redeem). Throws InsufficientFundsError if too low.
  async function debit(memberId, amountSatang, { type = 'ROBUX_REDEEM', reference = null, note = null } = {}) {
    if (amountSatang <= 0) throw new Error('amount must be positive');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE shop.member_wallets
            SET balance_satang = balance_satang - $3
          WHERE external_subject_id = $1 AND member_discord_id = $2 AND balance_satang >= $3
          RETURNING balance_satang`,
        [subjectId, memberId, amountSatang],
      );
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        throw new InsufficientFundsError();
      }
      const balanceAfter = Number(rows[0].balance_satang);
      await writeLedger(client, memberId, 'DEBIT', type, amountSatang, balanceAfter, reference, note);
      await client.query('COMMIT');
      emitBalance(memberId, balanceAfter);
      return balanceAfter;
    } catch (err) {
      if (err.code !== 'INSUFFICIENT_FUNDS') await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // Set the balance to an absolute amount (admin adjust). The delta is written to
  // the ledger as an ADJUST entry so the audit trail stays complete.
  async function setBalance(memberId, amountSatang, { note = null } = {}) {
    if (amountSatang < 0) throw new Error('amount must not be negative');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: prevRows } = await client.query(
        `SELECT balance_satang FROM shop.member_wallets
          WHERE external_subject_id = $1 AND member_discord_id = $2
          FOR UPDATE`,
        [subjectId, memberId],
      );
      const before = prevRows[0] ? Number(prevRows[0].balance_satang) : 0;
      await client.query(
        `INSERT INTO shop.member_wallets (external_subject_id, member_discord_id, balance_satang)
         VALUES ($1, $2, $3)
         ON CONFLICT (external_subject_id, member_discord_id)
         DO UPDATE SET balance_satang = $3`,
        [subjectId, memberId, amountSatang],
      );
      const delta = amountSatang - before;
      if (delta !== 0) {
        await writeLedger(client, memberId, delta > 0 ? 'CREDIT' : 'DEBIT', 'ADJUSTMENT',
          Math.abs(delta), amountSatang, null, note);
      }
      await client.query('COMMIT');
      emitBalance(memberId, amountSatang);
      return amountSatang;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // Latest top-up ledger entries for one member (newest first).
  async function getTopupHistory(memberId, limit = 10) {
    const { rows } = await pool.query(
      `SELECT amount_satang, note, reference, created_at
         FROM shop.wallet_ledger
        WHERE external_subject_id = $1 AND member_discord_id = $2
          AND direction = 'CREDIT' AND type = 'TOPUP'
        ORDER BY created_at DESC
        LIMIT $3`,
      [subjectId, memberId, limit],
    );
    return rows;
  }

  // Top-up totals over a recent window (default the last 1 month), from the
  // ledger. memberId null = every member of this bot.
  async function getTopupSummary({ memberId = null, interval = '1 month' } = {}) {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount_satang), 0)   AS total_satang,
              COUNT(*)                          AS entry_count,
              COUNT(DISTINCT member_discord_id) AS member_count
         FROM shop.wallet_ledger
        WHERE external_subject_id = $1
          AND direction = 'CREDIT' AND type = 'TOPUP'
          AND created_at >= now() - $2::interval
          AND ($3::text IS NULL OR member_discord_id = $3)`,
      [subjectId, interval, memberId],
    );
    return {
      totalSatang: Number(rows[0].total_satang),
      entryCount: Number(rows[0].entry_count),
      memberCount: Number(rows[0].member_count),
    };
  }

  // Lifetime top-up leaderboard for this bot's members.
  async function getLeaderboard(limit = 50) {
    const { rows } = await pool.query(
      `SELECT member_discord_id, total_topup_satang
         FROM shop.member_wallets
        WHERE external_subject_id = $1 AND total_topup_satang > 0
        ORDER BY total_topup_satang DESC
        LIMIT $2`,
      [subjectId, limit],
    );
    return rows;
  }

  function writeLedger(client, memberId, direction, type, amount, balanceAfter, reference, note) {
    return client.query(
      `INSERT INTO shop.wallet_ledger
        (external_subject_id, member_discord_id, direction, type, amount_satang, balance_after_satang, reference, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [subjectId, memberId, direction, type, amount, balanceAfter, reference, note],
    );
  }

  return {
    getBalance,
    credit,
    creditOnce,
    debit,
    setBalance,
    subscribeBalance,
    getTopupHistory,
    getTopupSummary,
    getLeaderboard,
  };
}

module.exports = { makeWallet, InsufficientFundsError };
