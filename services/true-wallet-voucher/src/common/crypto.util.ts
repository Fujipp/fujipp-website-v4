import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export function parseMasterKey(raw: string | undefined): Buffer {
  if (!raw) {
    throw new Error('MASTER_KEY is required');
  }

  const trimmed = raw.trim();
  const hex = /^[0-9a-f]{64}$/i.test(trimmed) ? Buffer.from(trimmed, 'hex') : null;
  const decoded = hex ?? Buffer.from(trimmed, 'base64');
  if (decoded.length !== 32) {
    throw new Error('MASTER_KEY must decode to exactly 32 bytes');
  }
  return decoded;
}

export function aesGcmEncrypt(masterKey: Buffer, plaintext: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]); // เก็บรวมกัน
}

export function aesGcmDecrypt(masterKey: Buffer, payload: Buffer) {
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(payload.length - 16);
  const enc = payload.subarray(12, payload.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec;
}

export function sha256Hex(input: string | Buffer) {
  return createHash('sha256').update(input).digest('hex');
}
