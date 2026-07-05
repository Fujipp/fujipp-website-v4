// src/routes/bots.js
// start / stop / restart / status for a subject's bot.

const express = require('express');
const db = require('../db');
const runner = require('../runner');
const { buildEnv, invalidateConfig } = require('../config-loader');

const router = express.Router();

async function setStatus(subjectId, status, field) {
  const set = field ? `, ${field} = now()` : '';
  await db.query(
    `UPDATE bots.bot_instances SET status = $2${set} WHERE id = $1`,
    [subjectId, status],
  );
}

// POST /bots/:subjectId/start
router.post('/:subjectId/start', async (req, res) => {
  const { subjectId } = req.params;
  try {
    const { env, codes } = await buildEnv(subjectId, { forceFresh: true });
    await runner.start(subjectId, env);
    await setStatus(subjectId, 'RUNNING', 'last_started_at');
    res.json({ subjectId, status: 'RUNNING', features: codes });
  } catch (err) {
    res.status(400).json({ subjectId, error: err.message });
  }
});

// POST /bots/:subjectId/stop
router.post('/:subjectId/stop', async (req, res) => {
  const { subjectId } = req.params;
  try {
    await runner.stop(subjectId);
    invalidateConfig(subjectId);
    await setStatus(subjectId, 'STOPPED', 'last_stopped_at');
    res.json({ subjectId, status: 'STOPPED' });
  } catch (err) {
    res.status(500).json({ subjectId, error: err.message });
  }
});

// POST /bots/:subjectId/restart
router.post('/:subjectId/restart', async (req, res) => {
  const { subjectId } = req.params;
  try {
    const { env, codes } = await buildEnv(subjectId, { forceFresh: true });
    await runner.restart(subjectId, env);
    await setStatus(subjectId, 'RUNNING', 'last_started_at');
    res.json({ subjectId, status: 'RUNNING', features: codes });
  } catch (err) {
    res.status(400).json({ subjectId, error: err.message });
  }
});

// GET /bots/:subjectId/status
router.get('/:subjectId/status', async (req, res) => {
  const { subjectId } = req.params;
  try {
    const info = await runner.status(subjectId);
    res.json({ subjectId, ...info });
  } catch (err) {
    res.status(500).json({ subjectId, error: err.message });
  }
});

module.exports = router;
