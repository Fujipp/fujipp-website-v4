// src/runner/pm2-runner.js
// BotRunner backed by PM2 (v1). One PM2 process per subject, named bot-<subjectId>.
// Swapping to Docker later means writing a DockerRunner with the same 4 methods —
// nothing else in the orchestrator changes.

const path = require('path');
const http = require('http');
const fs = require('fs');
const pm2 = require('pm2');

const ENTRY = path.resolve(__dirname, '..', '..', process.env.CENTRAL_BOT_ENTRY || '../central-bot/src/server.js');

const procName = (subjectId) => `bot-${subjectId}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readReady(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port,
        path: '/readyz',
        timeout: 1500,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (_err) {
            reject(new Error(`invalid readyz response: HTTP ${res.statusCode}`));
          }
        });
      },
    );
    req.on('timeout', () => {
      req.destroy(new Error('readyz timeout'));
    });
    req.on('error', reject);
  });
}

function describeProcess(subjectId) {
  return new Promise((resolve, reject) => {
    pm2.describe(procName(subjectId), (err, list) => {
      if (err) return reject(err);
      resolve((list && list[0]) || null);
    });
  });
}

async function readTail(filePath, maxBytes = 6000) {
  if (!filePath) return '';
  let handle;
  try {
    const stat = await fs.promises.stat(filePath);
    const start = Math.max(0, stat.size - maxBytes);
    const length = stat.size - start;
    if (length <= 0) return '';
    const buffer = Buffer.alloc(length);
    handle = await fs.promises.open(filePath, 'r');
    await handle.read(buffer, 0, length, start);
    return buffer.toString('utf8');
  } catch (_err) {
    return '';
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

function cleanLogTail(raw) {
  return String(raw || '')
    .replace(/\.ROBLOSECURITY=[^;\s]+/g, '.ROBLOSECURITY=[redacted]')
    .replace(/ROBLOX_SECURITY_COOKIE\S*/g, 'ROBLOX_SECURITY_COOKIE[redacted]')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-12)
    .join(' | ');
}

async function processDiagnostic(subjectId) {
  const proc = await describeProcess(subjectId).catch(() => null);
  if (!proc) return '';

  const env = proc.pm2_env || {};
  const parts = [
    `pm2 status=${env.status || 'unknown'}`,
    `restarts=${env.restart_time ?? 0}`,
  ];

  const logTail = cleanLogTail(await readTail(env.pm_err_log_path));
  if (logTail) parts.push(`latest error log: ${logTail}`);
  return parts.join('; ');
}

async function waitUntilReady(subjectId, env) {
  const port = Number(env.PORT);
  if (!Number.isFinite(port) || port <= 0) return;

  const deadline = Date.now() + 25_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const ready = await readReady(port);
      if (ready.subjectId && String(ready.subjectId) !== String(subjectId)) {
        lastError = new Error(`readyz subject mismatch: ${ready.subjectId}`);
      // A degraded bot is connected to Discord and can serve the healthy
      // features. Keep it online; feature-level warnings must not make the
      // orchestrator delete the whole PM2 process after the readiness timeout.
      } else if (ready.status === 'running' || ready.status === 'degraded') {
        return;
      } else if (ready.status === 'crashed') {
        throw new Error(ready.error || 'central-bot failed to log in; check bot token, public app settings, and runtime logs');
      }
    } catch (err) {
      lastError = err;
    }
    await sleep(500);
  }
  const diagnostic = await processDiagnostic(subjectId);
  throw new Error(
    `central-bot did not become ready on port ${port}`
    + `${lastError ? `: ${lastError.message}` : ''}`
    + `${diagnostic ? ` (${diagnostic})` : ''}`,
  );
}

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

function deleteProcess(subjectId) {
  return new Promise((resolve, reject) => {
    pm2.delete(procName(subjectId), (err) => {
      // "process not found" is not a failure for cleanup.
      if (err && !/not found|process name/i.test(err.message)) return reject(err);
      resolve();
    });
  });
}

function start(subjectId, env) {
  return withPm2(async () => {
    await new Promise((resolve, reject) => {
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
    });
    try {
      await waitUntilReady(subjectId, env);
    } catch (err) {
      await deleteProcess(subjectId).catch(() => {});
      throw err;
    }
  });
}

function stop(subjectId) {
  return withPm2(
    () => deleteProcess(subjectId),
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
