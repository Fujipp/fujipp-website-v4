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

const PORT = Number(process.env.PORT) || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[central-bot] HTTP server on 0.0.0.0:${PORT}`);
  bot
    .start()
    .then(() => {
      botStatus = 'running';
    })
    .catch((err) => {
      botStatus = 'crashed';
      console.error('[central-bot] failed to start bot:', err);
    });
});

const graceful = (signal) => {
  console.log(`[central-bot] ${signal} received, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => graceful('SIGTERM'));
process.on('SIGINT', () => graceful('SIGINT'));
