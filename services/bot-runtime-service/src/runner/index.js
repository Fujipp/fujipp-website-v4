// src/runner/index.js
// Selects the BotRunner implementation. v1 = PM2. To move to Docker later, add a
// docker-runner.js with the same { start, stop, restart, status } and switch here
// (e.g. via process.env.BOT_RUNNER). The rest of the orchestrator is runner-agnostic.

const pm2Runner = require('./pm2-runner');

module.exports = pm2Runner;
