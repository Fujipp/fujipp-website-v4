// src/server.js
// Internal orchestrator API. Every /bots route requires the shared X-Service-Token
// (the backend sends it). This service is never exposed publicly.

require('dotenv').config();
const express = require('express');
const botsRouter = require('./routes/bots');
const db = require('./db');
const runner = require('./runner');
const { buildEnv } = require('./config-loader');

const app = express();
app.use(express.json());

// ── Resume-on-boot ───────────────────────────────────────────────────────────
// Bots run as pm2 processes INSIDE this container. A deploy recreates the
// container (central-bot ships in the same image as this orchestrator), which
// kills every bot — and nothing brought them back, so each one had to be started
// by hand. On startup we re-start the bots the DB still marks as RUNNING.
//
// Scope (bots are placed per VPS node, bot_instances.vps_node_id):
//   RUNTIME_NODE_ID set   → only that node's bots (use this when more than one
//                           orchestrator runs, so nodes don't fight over a bot).
//   RUNTIME_NODE_ID unset → every RUNNING bot (correct for the current single
//                           orchestrator host).
// Set RESUME_ON_BOOT=false to disable. Best-effort: a bot that fails to start
// (e.g. bad token / disallowed intents) is logged and skipped, its DB status left
// as RUNNING so a later boot retries and the live badge still shows it offline.
const RESUME_STAGGER_MS = Number(process.env.RESUME_STAGGER_MS) || 1500;

async function resumeRunningBots() {
  if (String(process.env.RESUME_ON_BOOT).toLowerCase() === 'false') {
    console.log('[runtime] resume-on-boot: disabled (RESUME_ON_BOOT=false)');
    return;
  }
  const nodeId = (process.env.RUNTIME_NODE_ID || '').trim();
  try {
    const { rows } = nodeId
      ? await db.query(
        "SELECT id FROM bots.bot_instances WHERE status = 'RUNNING' AND vps_node_id = $1 ORDER BY id",
        [nodeId],
      )
      : await db.query(
        "SELECT id FROM bots.bot_instances WHERE status = 'RUNNING' ORDER BY id",
      );

    if (rows.length === 0) {
      console.log('[runtime] resume-on-boot: no RUNNING bots to restore');
      return;
    }
    console.log(`[runtime] resume-on-boot: restoring ${rows.length} bot(s)${nodeId ? ` for node ${nodeId}` : ''}`);

    let ok = 0;
    for (const { id } of rows) {
      try {
        const { env } = await buildEnv(id);
        await runner.start(id, env);
        ok += 1;
        console.log(`[runtime] resume-on-boot: started ${id}`);
      } catch (err) {
        // Leave status = RUNNING so the next boot retries and the live badge stays honest.
        console.error(`[runtime] resume-on-boot: skip ${id}: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, RESUME_STAGGER_MS));
    }
    console.log(`[runtime] resume-on-boot: done (${ok}/${rows.length} restored)`);
  } catch (err) {
    console.error(`[runtime] resume-on-boot failed: ${err.message}`);
  }
}

app.get('/healthz', (_req, res) => res.status(200).json({ status: 'healthy' }));

// Shared-secret gate for everything below.
app.use((req, res, next) => {
  const expected = process.env.SERVICE_TOKEN;
  if (!expected) return res.status(500).json({ error: 'SERVICE_TOKEN not configured' });
  if (req.get('X-Service-Token') !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

app.use('/bots', botsRouter);

const PORT = Number(process.env.PORT) || 8090;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[runtime] orchestrator listening on 0.0.0.0:${PORT}`);
  // Kick the resume after the server is up so /healthz answers immediately and the
  // restore runs in the background instead of blocking startup.
  resumeRunningBots().catch((err) => console.error('[runtime] resume-on-boot crashed:', err.message));
});
