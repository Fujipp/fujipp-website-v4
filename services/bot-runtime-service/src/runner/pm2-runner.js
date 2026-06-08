// src/runner/pm2-runner.js
// BotRunner backed by PM2 (v1). One PM2 process per subject, named bot-<subjectId>.
// Swapping to Docker later means writing a DockerRunner with the same 4 methods —
// nothing else in the orchestrator changes.

const path = require('path');
const pm2 = require('pm2');

const ENTRY = path.resolve(__dirname, '..', '..', process.env.CENTRAL_BOT_ENTRY || '../central-bot/src/server.js');

const procName = (subjectId) => `bot-${subjectId}`;

function connect() {
  return new Promise((resolve, reject) => pm2.connect((err) => (err ? reject(err) : resolve())));
}
function disconnect() {
  pm2.disconnect();
}

function withPm2(fn) {
  return connect().then(async () => {
    try {
      return await fn();
    } finally {
      disconnect();
    }
  });
}

function start(subjectId, env) {
  return withPm2(
    () =>
      new Promise((resolve, reject) => {
        pm2.start(
          {
            name: procName(subjectId),
            script: ENTRY,
            env,
            autorestart: true,
            max_restarts: 10,
            kill_timeout: 10000,
          },
          (err, proc) => (err ? reject(err) : resolve(proc)),
        );
      }),
  );
}

function stop(subjectId) {
  return withPm2(
    () =>
      new Promise((resolve, reject) => {
        pm2.delete(procName(subjectId), (err) => {
          // "process not found" is not a failure for stop()
          if (err && !/not found|process name/i.test(err.message)) return reject(err);
          resolve();
        });
      }),
  );
}

async function restart(subjectId, env) {
  await stop(subjectId);
  return start(subjectId, env);
}

function status(subjectId) {
  return withPm2(
    () =>
      new Promise((resolve, reject) => {
        pm2.describe(procName(subjectId), (err, list) => {
          if (err) return reject(err);
          if (!list || list.length === 0) return resolve({ state: 'stopped' });
          const p = list[0];
          resolve({
            state: p.pm2_env?.status || 'unknown', // online | stopped | errored | ...
            restarts: p.pm2_env?.restart_time ?? 0,
            uptime: p.pm2_env?.pm_uptime ?? null,
            cpu: p.monit?.cpu ?? null,
            memory: p.monit?.memory ?? null,
          });
        });
      }),
  );
}

module.exports = { start, stop, restart, status };
