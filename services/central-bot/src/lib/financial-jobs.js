const { query } = require('./db');

async function createJob(subjectId, kind, memberId, amountSatang, payload) {
  const { rows } = await query(
    `INSERT INTO shop.bot_financial_jobs
      (external_subject_id, kind, member_discord_id, amount_satang, payload)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id`,
    [subjectId, kind, memberId, amountSatang, JSON.stringify(payload || {})],
  );
  return rows[0].id;
}

async function setJobStatus(subjectId, jobId, status, { result = null, error = null } = {}) {
  await query(
    `UPDATE shop.bot_financial_jobs
        SET status = $3,
            result = COALESCE($4::jsonb, result),
            error_message = $5,
            completed_at = CASE WHEN $3 IN ('SUCCEEDED','FAILED','REFUNDED','REVIEW_REQUIRED') THEN now() ELSE NULL END
      WHERE id = $2 AND external_subject_id = $1`,
    [subjectId, jobId, status, result == null ? null : JSON.stringify(result), error],
  );
}

async function claimDebitedJob(subjectId, jobId) {
  const { rowCount } = await query(
    `UPDATE shop.bot_financial_jobs
        SET status = 'PROCESSING'
      WHERE id = $2 AND external_subject_id = $1 AND status = 'DEBITED'`,
    [subjectId, jobId],
  );
  return rowCount === 1;
}

async function listRecoverableJobs(subjectId, kind) {
  const { rows } = await query(
    `SELECT id, member_discord_id, amount_satang, payload, status
       FROM shop.bot_financial_jobs
      WHERE external_subject_id = $1 AND kind = $2
        AND status IN ('DEBITED','PROCESSING')
      ORDER BY created_at ASC`,
    [subjectId, kind],
  );
  return rows;
}

module.exports = { createJob, setJobStatus, claimDebitedJob, listRecoverableJobs };
