# New VPS Runtime Foundation

Greenfield deployment notes for the new Fujipp backend VPS.

This path is intentionally separate from `docker/docker-compose.prod.yml`, which
documents the older shared VPS. Do not use this plan to migrate or mutate the old
server. Treat the old server as production/reference and this server as a clean
runtime rebuild.

## Target Host

- Hostname: `FujippBackend`
- OS: Ubuntu 24.04 LTS
- CPU: 4 vCPU
- RAM: 8 GB
- Disk: 70 GB class, about 67 GB mounted at `/`
- App root: `/opt/fujipp`

## Runtime Goal

Keep fixed platform services small and reserve most memory for managed Discord bot
processes:

| Area | Container limit | Purpose |
| --- | ---: | --- |
| backend | 768 MB | Public/admin API and internal service gateway |
| billing | 640 MB | Wallet, orders, catalog, subscriptions, audit |
| voucher | 384 MB | Internal TrueMoney voucher redeem API |
| runtime | 4096 MB | Bot orchestrator plus PM2-managed central-bot processes |

This leaves roughly 2 GB for the OS, Docker overhead, page cache, SSH/admin work,
and short memory spikes. Tighten or raise limits only after observing real RSS.

## One-Time Host Setup

Run these as `deploy` after Docker is installed and the user has re-logged so the
`docker` group applies:

```bash
sudo mkdir -p /opt/fujipp/{apps,env,logs,backups}
sudo chown -R deploy:deploy /opt/fujipp
```

Copy this folder to the server:

```bash
rsync -av infrastructure/new-vps/ deploy@YOUR_NEW_VPS_IP:/opt/fujipp/apps/new-vps/
```

Create the runtime env from the template:

```bash
cp /opt/fujipp/apps/new-vps/env.example /opt/fujipp/env/platform.env
nano /opt/fujipp/env/platform.env
```

Start the stack only after secrets are filled:

```bash
cd /opt/fujipp/apps/new-vps
docker compose --env-file /opt/fujipp/env/platform.env up -d
```

## Branch Image Build

Do not use the old production deploy workflow for this greenfield server. From a
feature branch, run **Build New VPS Images** manually in GitHub Actions. It builds
and pushes all four images from the selected branch without deploying to any VPS.

After it succeeds, copy the four image lines from the workflow summary into:

```bash
nano /opt/fujipp/env/platform.env
```

They will look like:

```dotenv
BACKEND_IMAGE=ghcr.io/fujipp/fujipp-backend:<commit-sha>
BILLING_IMAGE=ghcr.io/fujipp/fujipp-billing:<commit-sha>
VOUCHER_IMAGE=ghcr.io/fujipp/fujipp-voucher:<commit-sha>
RUNTIME_IMAGE=ghcr.io/fujipp/fujipp-runtime:<commit-sha>
```

Then pull again:

```bash
cd /opt/fujipp/apps/new-vps
docker compose --env-file /opt/fujipp/env/platform.env pull
```

## First Smoke Checks

```bash
docker compose --env-file /opt/fujipp/env/platform.env ps
docker compose --env-file /opt/fujipp/env/platform.env logs --tail=80 backend
docker compose --env-file /opt/fujipp/env/platform.env logs --tail=80 runtime
curl -fsS http://127.0.0.1:3600/api/public/health
curl -fsS http://127.0.0.1:8090/healthz
```

Do not point DNS or production traffic here until the stack stays stable under
manual smoke tests and idle observation.

## Operating Rules

- Keep SSH to key-based `deploy`; do not deploy as root.
- Do not store real env files in git.
- Keep ports 8080/8081/8082 internal to Docker.
- Publish only loopback ports until nginx/domain cutover is deliberately planned.
- Keep `RUNTIME_AUTOMATION_ENABLED=false` during bring-up; it can charge wallets
  and stop live bots.
- Use the Supabase transaction pooler URL with `sslmode=require` and
  `prepareThreshold=0`.
- Set `RUNTIME_NODE_ID` once this host is registered as a VPS node, so
  resume-on-boot only restores bots assigned to this machine.

## Memory Notes

`NODE_OPTIONS=--max-old-space-size=128` is inherited by the orchestrator and every
central-bot process it spawns. This limits V8 old-space per bot, but RSS can still
grow with native libraries, Discord.js objects, voice connections, PM2, and Node
runtime overhead. Measure with:

```bash
docker stats
docker compose --env-file /opt/fujipp/env/platform.env exec runtime ps -o pid,rss,comm,args
```

If one bot consistently needs more memory, raise the cap deliberately and reduce
the expected bot density for the host.
