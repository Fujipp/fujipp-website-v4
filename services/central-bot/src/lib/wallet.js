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

function makeWallet(subjectId) {
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
      return balanceAfter;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
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
      return balanceAfter;
    } catch (err) {
      if (err.code !== 'INSUFFICIENT_FUNDS') await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  function writeLedger(client, memberId, direction, type, amount, balanceAfter, reference, note) {
    return client.query(
      `INSERT INTO shop.wallet_ledger
        (external_subject_id, member_discord_id, direction, type, amount_satang, balance_after_satang, reference, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [subjectId, memberId, direction, type, amount, balanceAfter, reference, note],
    );
  }

  return { getBalance, credit, debit };
}

module.exports = { makeWallet, InsufficientFundsError };
