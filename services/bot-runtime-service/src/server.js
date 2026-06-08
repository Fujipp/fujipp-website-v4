// src/server.js
// Internal orchestrator API. Every /bots route requires the shared X-Service-Token
// (the backend sends it). This service is never exposed publicly.

require('dotenv').config();
const express = require('express');
const botsRouter = require('./routes/bots');

const app = express();
app.use(express.json());

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
});
