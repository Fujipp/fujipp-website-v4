// src/features/review-credit/store.js
// Persistent review counter for one bot (subject). Replaces the legacy bot's local
// data/config.json: the running message_count that drives the channel name and the
// id of the last bot reply (so the next reply can delete the previous one). Rows
// live in shop.review_credit_state, scoped by external_subject_id + channel_id.

const { pool } = require('../../lib/db');

function makeReviewStore(subjectId) {
  // Read the saved state for a channel. Returns zeros for a channel never seen.
  async function getState(channelId) {
    const { rows } = await pool.query(
      `SELECT message_count, last_bot_message_id FROM shop.review_credit_state
        WHERE external_subject_id = $1 AND channel_id = $2`,
      [subjectId, String(channelId)],
    );
    return {
      messageCount: rows[0] ? Number(rows[0].message_count) : 0,
      lastBotMessageId: rows[0] ? rows[0].last_bot_message_id : null,
    };
  }

  // Whether a counter row exists yet for this channel. Used to decide whether to
  // run the one-time full recount on startup (absent row = never counted / reset).
  async function exists(channelId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM shop.review_credit_state
        WHERE external_subject_id = $1 AND channel_id = $2`,
      [subjectId, String(channelId)],
    );
    return rows.length > 0;
  }

  // Atomically bump the counter by one and return the new count.
  async function increment(channelId) {
    const { rows } = await pool.query(
      `INSERT INTO shop.review_credit_state (external_subject_id, channel_id, message_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (external_subject_id, channel_id)
       DO UPDATE SET message_count = shop.review_credit_state.message_count + 1
       RETURNING message_count`,
      [subjectId, String(channelId)],
    );
    return Number(rows[0].message_count);
  }

  // Set the counter to an absolute value (used by /checkcredit after a full recount).
  async function setCount(channelId, count) {
    await pool.query(
      `INSERT INTO shop.review_credit_state (external_subject_id, channel_id, message_count)
       VALUES ($1, $2, $3)
       ON CONFLICT (external_subject_id, channel_id)
       DO UPDATE SET message_count = EXCLUDED.message_count`,
      [subjectId, String(channelId), count],
    );
    return count;
  }

  // Remember the id of the latest bot reply so we can delete it next time.
  async function setLastMessageId(channelId, messageId) {
    await pool.query(
      `INSERT INTO shop.review_credit_state (external_subject_id, channel_id, last_bot_message_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (external_subject_id, channel_id)
       DO UPDATE SET last_bot_message_id = EXCLUDED.last_bot_message_id`,
      [subjectId, String(channelId), messageId ? String(messageId) : null],
    );
  }

  return { getState, exists, increment, setCount, setLastMessageId };
}

module.exports = { makeReviewStore };
