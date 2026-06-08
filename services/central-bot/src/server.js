// src/server.js
// Process entrypoint. Exposes a health endpoint (so the orchestrator / PaaS can
// probe liveness) then boots the Discord bot. Boot failures keep the HTTP server
// up so logs stay reachable.

require('dotenv').config();
const express = require('express');
const bot = require('./bot');

const app = express();
app.set('trust proxy', true);

let botStatus = 'starting';
app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'healthy' }));
app.get('/readyz', (_req, res) =>
  res.status(200).json({
    status: botStatus,
    subjectId: process.env.BOT_SUBJECT_ID || null,
    uptime: process.uptime(),
    pid: process.pid,
    time: new Date().toISOString(),
  }),
);

let botClient = null;

const PORT = Number(process.env.PORT) || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[central-bot] HTTP server on 0.0.0.0:${PORT}`);
  bot
    .start()
    .then((client) => {
      botClient = client;
      botStatus = 'running';
    })
    .catch((err) => {
      botStatus = 'crashed';
      console.error('[central-bot] failed to start bot:', err);
    });
});

let shuttingDown = false;
const graceful = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[central-bot] ${signal} received, shutting down...`);
  // Log out of Discord cleanly so the bot goes offline immediately (instead of
  // lingering until the gateway session times out).
  try {
    if (botClient) await botClient.destroy();
  } catch (err) {
    console.error('[central-bot] error destroying Discord client:', err.message);
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', () => graceful('SIGTERM'));
process.on('SIGINT', () => graceful('SIGINT'));
