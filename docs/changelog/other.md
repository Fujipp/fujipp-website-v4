# Changelog — Other (infra · CI · docs · tooling)

**Current version: `0.0.5.6`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.0.5.6` | 2026-06-07 | point truemoney DATABASE_URL at /app/data (absolute) and migrate before bootstrap |
| `0.0.5.5` | 2026-06-07 | install OpenSSL in the truemoney image so the Prisma query engine loads |
| `0.0.5.4` | 2026-06-07 | ship truemoney src + scripts + tsconfig in prod image so the ts-node bootstrap can run |
| `0.0.5.3` | 2026-06-07 | set truemoney NODE_ENV after npm ci so prod image keeps prisma CLI + ts-node (migrate/bootstrap work) |
| `0.0.5.2` | 2026-06-07 | export image vars in deploy so docker compose interpolation resolves them |
| `0.0.5.1` | 2026-06-07 | backend deploy rolls only the changed service(s) (paths-filter + targeted compose up) |
| `0.0.5` | 2026-06-07 | wire TrueMoney voucher service into backend CI/CD and production compose |
| `0.0.4.1` | 2026-06-07 | add bootstrap migration command for TrueMoney voucher service |
| `0.0.4` | 2026-06-07 | add TrueMoney voucher redeem service scaffold |
| `0.0.3` | 2026-06-05 | scaffold bot-runtime-service orchestrator (PM2 runner, AES-GCM secret decrypt) |
| `0.0.2` | 2026-06-05 | scaffold central-bot service (feature-module system + Roblox feature) |
| `0.0.1.6` | 2026-06-05 | add Feature Bot platform design doc (sell/config/run flow) |
| `0.0.1.5` | 2026-06-05 | add backend & database agent rules and per-area changelog |
| `0.0.1.4` | 2026-06-04 | deploy frontend over FTP (shared host has no SSH) |
| `0.0.1.3` | 2026-06-04 | drop --frozen-lockfile for frontend (bun.lock drifts from package.json) |
| `0.0.1.2` | 2026-06-04 | add main-only deploy pipelines for frontend and backend |
| `0.0.1.1` | 2026-06-04 | add VPS bootstrap script and deployment guide |
| `0.0.1` | 2026-06-04 | containerize backend and billing for the shared VPS |
| `0.0.0.9` | 2026-06-04 | add SlipOK API guide |
| `0.0.0.8` | 2026-06-03 | add Supabase CLI dependency |
| `0.0.0.7` | 2026-06-03 | add repository workflow guidance |
| `0.0.0.6` | 2026-06-02 | update README |
| `0.0.0.5` | 2026-05-26 | refine push workflow grouping |
| `0.0.0.4` | 2026-05-26 | sync work and push |
| `0.0.0.3` | 2026-05-23 | push current project-setup changes |
| `0.0.0.2` | 2026-05-23 | add repository setup guide |
| `0.0.0.1` | 2026-05-23 | Initial commit |
