import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaService } from '../src/db/prisma.service';
import { KeysService } from '../src/keys/keys.service';
import { aesGcmDecrypt, parseMasterKey } from '../src/common/crypto.util';

type Options = {
  clientId: string;
  name: string;
  ttlDays?: number;
  forceKey: boolean;
  keyFile?: string;
};

function parseArgs(argv: string[]): Options {
  const opts: Partial<Options> = { forceKey: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--client' && next) {
      opts.clientId = next;
      i += 1;
    } else if (arg === '--name' && next) {
      opts.name = next;
      i += 1;
    } else if (arg === '--ttl' && next) {
      opts.ttlDays = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === '--key-file' && next) {
      opts.keyFile = next;
      i += 1;
    } else if (arg === '--force-key') {
      opts.forceKey = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  opts.clientId = opts.clientId || process.env.BOOTSTRAP_CLIENT_ID || 'kanom-001';
  opts.name = opts.name || process.env.BOOTSTRAP_CLIENT_NAME || opts.clientId;

  if (opts.ttlDays !== undefined && (!Number.isFinite(opts.ttlDays) || opts.ttlDays <= 0)) {
    throw new Error('--ttl must be a positive number of days');
  }

  return opts as Options;
}

function printUsage() {
  console.log([
    'Usage: npm run db:bootstrap -- --client kanom-001 --name "Kanom 001" [--ttl 365] [--force-key]',
    '       npm run db:bootstrap -- --client kanom-001 --key-file ./data/kanom-001.full-key',
    '',
    'Creates or updates a client record, then creates the first API key when none exists.',
    'Use --force-key to create another key for an existing client.',
  ].join('\n'));
}

function fullKeyFromRow(key: { id: string; secretEncrypted: Buffer | Uint8Array }) {
  const secretPlain = aesGcmDecrypt(parseMasterKey(process.env.MASTER_KEY), Buffer.from(key.secretEncrypted));
  return `${key.id}.${secretPlain.toString('base64url')}`;
}

function writeKeyFile(filePath: string | undefined, fullKey: string) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${fullKey}\n`, { mode: 0o600 });
  console.log(`KEY_FILE_WRITTEN path=${filePath}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const prisma = new PrismaService();
  const keys = new KeysService(prisma);

  await prisma.$connect();

  try {
    const client = await prisma.client.upsert({
      where: { id: opts.clientId },
      update: { name: opts.name, status: 'ACTIVE' },
      create: { id: opts.clientId, name: opts.name, status: 'ACTIVE' },
    });

    const activeKey = await prisma.apiKey.findFirst({
      where: {
        clientId: client.id,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`CLIENT_READY id=${client.id} name="${client.name}"`);

    if (activeKey && !opts.forceKey) {
      console.log('ACTIVE_KEY_EXISTS create_skipped=true');
      writeKeyFile(opts.keyFile, fullKeyFromRow(activeKey));
      console.log('Use --force-key if you need to issue a new full key.');
      return;
    }

    const key = await keys.createKey(client.id, 'ak_live', ['redeem:create'], opts.ttlDays);
    console.log('KEY_CREATED');
    console.log(`keyId=${key.keyId}`);
    console.log(`expiresAt=${key.expiresAt ? key.expiresAt.toISOString() : 'none'}`);
    writeKeyFile(opts.keyFile, key.fullKey);
    // Only echo the secret full key when there's no file to receive it (manual
    // interactive use). Never print it during CI deploys — that leaks it to logs.
    if (!opts.keyFile) {
      console.log(`fullKey=${key.fullKey}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
