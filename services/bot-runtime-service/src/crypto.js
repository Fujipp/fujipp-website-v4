// src/crypto.js
// AES-256-GCM for Discord tokens + per-feature secrets.
// Envelope (text):  v1.<base64 iv>.<base64 authTag>.<base64 ciphertext>
// The key (BOT_SECRET_KEY) is 32 bytes given as 64-char hex or base64.

const crypto = require('crypto');

const VERSION = 'v1';
const IV_BYTES = 12;

function loadKey() {
  const raw = (process.env.BOT_SECRET_KEY || '').trim();
  if (!raw) throw new Error('BOT_SECRET_KEY is not set');
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('BOT_SECRET_KEY must decode to 32 bytes');
  return key;
}

function encrypt(plaintext) {
  const key = loadKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.');
}

function decrypt(envelope) {
  if (!envelope) return null;
  const parts = String(envelope).split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('unrecognized secret envelope');
  }
  const key = loadKey();
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const ct = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
