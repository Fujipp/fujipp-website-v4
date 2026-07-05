# Deployment & Infrastructure

CI/CD lives in [`.github/workflows`](../.github/workflows). Everything deploys **only from `main`**:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | PRs / non-main pushes | Type-checks + builds frontend & backend. No deploy. |
| `deploy-frontend.yml` | push to `main`, `frontend/**` | `bun run build` → rsync `dist/` to the DirectAdmin host (`fujipp.com`). |
| `deploy-backend.yml` | push to `main`, `backend/** \| services/** \| docker/**` | Builds 2 images → GHCR (public) → SSH to VPS → `docker compose up -d`. |

```
push main ──┬─ frontend/** ─→ build ─ rsync/SSH ─→ fujipp.com  (Apache, static SPA)
            └─ backend|services|docker/** ─→ 2 images ─ GHCR ─ SSH ─→ VPS
                                       (existing) nginx :443 api.fujipp.com ─→ 127.0.0.1:3600
                                                                  └─ compose: backend(host 3600 → ctr 8080)
                                                                              billing(8081, internal-only)
                                                                                └─→ Supabase (cloud Postgres)
```

> **The VPS is shared.** `154.215.14.227` already runs pm2 Discord bots (ports
> 8080/8081/3000) and an nginx + Let's Encrypt vhost for `api.fujipp.com` that
> proxies to `127.0.0.1:3600`. The backend container publishes **host port 3600**
> to slot into that existing vhost. CI never touches nginx, the cert, the firewall,
> or the bots. Container memory is capped so the JVMs can't OOM-kill the bots.

---

## One-time setup

### 1. DNS

Already done — `api.fujipp.com` resolves to `154.215.14.227` and a Let's Encrypt
cert is live on the VPS. (`fujipp.com` itself points at the DirectAdmin shared host.)
Nothing to change here unless the IP moves.

### 2. SSH key for the VPS (backend only)

The backend deploy uses key-based SSH to the VPS. The frontend host is a shared
DirectAdmin plan with **no SSH**, so the frontend deploys over FTP instead.

```bash
ssh-keygen -t ed25519 -f ./fujipp-deploy -C "github-actions" -N ""
```

- Put the **private** key into the GitHub secret `VPS_SSH_KEY`.
- Install the **public** key on the VPS (bootstrap step 4 via `DEPLOY_PUBKEY`, or `ssh-copy-id`).

### 3. GitHub secrets

Repo → **Settings → Secrets and variables → Actions**. Also create an **Environment** named `production` (the deploy jobs use it).

**Frontend** (shared host has no SSH — deploy over FTP)
| Secret | Example |
| --- | --- |
| `FTP_HOST` | `103.27.200.238` |
| `FTP_PORT` | `21` |
| `FTP_USER` | `fujippme` |
| `FTP_PASSWORD` | *(DirectAdmin/FTP password)* |
| `FTP_REMOTE_DIR` | `domains/fujipp.com/public_html` |
| `FRONTEND_ENV_FILE` | *(multi-line, see below)* |

```dotenv
# FRONTEND_ENV_FILE
VITE_API_BASE_URL=https://api.fujipp.com
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

**Backend**
| Secret | Example |
| --- | --- |
| `VPS_SSH_HOST` | `154.215.14.227` |
| `VPS_SSH_PORT` | `22` |
| `VPS_SSH_USER` | `root` |
| `VPS_SSH_KEY` | *(private key contents)* |
| `BACKEND_ENV_FILE` | *(multi-line, see below)* |

```dotenv
# BACKEND_ENV_FILE — read by both backend & billing (Spring ignores keys it doesn't use).
# BILLING_BASE_URL is injected by compose (http://billing:8081) — do not set it here.

# Supabase Postgres (use the transaction pooler host)
DB_URL=jdbc:postgresql://<pooler-host>:6543/postgres?sslmode=require&prepareThreshold=0
DB_USERNAME=postgres.<project-ref>
DB_PASSWORD=<database-password>
DB_POOL_MAX_SIZE=3
DB_POOL_MIN_IDLE=0

# Supabase auth
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_JWT_SECRET=<jwt-secret>

# CORS — the production frontend origin
CORS_ALLOWED_ORIGINS=https://fujipp.com
CORS_ALLOWED_ORIGIN_PATTERNS=https://fujipp.com

# Internal service auth (must match between backend & billing) — openssl rand -hex 32
BILLING_SERVICE_TOKEN=<strong-random-secret>

# SlipOK
SLIPOK_BASE_URL=https://api.slipok.com
SLIPOK_BRANCH_ID=<your-branch-id>
SLIPOK_API_KEY=<your-api-key>

# PromptPay receiver id of the shop
PROMPTPAY_ID=<shop-promptpay-id>

# TrueMoney voucher service (local-only container; used by legacy PM2 bots)
# Generate with: openssl rand -base64 32
MASTER_KEY=<32-byte-base64-or-64-char-hex>
TW_USER_AGENT=tmn-redeemer/1.0
TW_TIMEOUT_MS=12000
BOOTSTRAP_CLIENT_ID=kanom-001
BOOTSTRAP_CLIENT_NAME=Kanom 001
```

> GHCR uses the built-in `GITHUB_TOKEN` — no secret needed. After the first push,
> set the packages (`fujipp-backend`, `fujipp-billing`, `fujipp-truemoney-voucher`)
> to **Public** under the repo's *Packages* settings so the VPS can pull without
> logging in.

### 4. Bootstrap the VPS (once)

```bash
scp infrastructure/vps-bootstrap.sh root@154.215.14.227:/root/
ssh root@154.215.14.227 'DEPLOY_PUBKEY="$(cat)" bash /root/vps-bootstrap.sh' < fujipp-deploy.pub
```

Installs **only Docker** and creates `/opt/fujipp`. It does *not* touch nginx, the
cert, the firewall, or the pm2 bots — those already exist on this shared box.

### 5. First deploy

Merge to `main` (or run the workflows manually via *Actions → Run workflow*).

---

## Operations

**Rollback the backend** to a previous commit on the VPS:

```bash
cd /opt/fujipp
sed -i 's#:[0-9a-f]\{40\}$#:<good-sha>#' .env   # repoint BACKEND_IMAGE/BILLING_IMAGE
docker compose pull && docker compose up -d
```

**TrueMoney voucher service:** deployed in the same compose stack as
`true-wallet-voucher`, published only to `127.0.0.1:3611`. The deploy workflow
bootstraps the `kanom-001` client and writes the reusable full key to
`/opt/fujipp/truemoney-voucher-data/kanom-001.full-key`, then points the legacy
PM2 process `bot-kanom-roblox` at `http://127.0.0.1:3611` when that bot directory
exists on the VPS.

**Adding another bot-host VPS** (manual register flow). A bot consumes one *slot* on a
VPS node (`bots.vps_nodes.max_slots`); when every ACTIVE node is full a purchase is
refused with a clear "all hosts are full" error. To add capacity on a new Thai VPS:

1. **Provision** the VPS and install Docker (reuse `vps-bootstrap.sh`, or just install Docker).
2. **Run the orchestrator** (`services/bot-runtime-service`) on it with `SERVICE_TOKEN`
   (a fresh `openssl rand -hex 32`) and a `PORT`. Make sure the backend can reach that
   `host:port` privately (VPN / private network / firewall allowlist — never expose it
   publicly). Confirm `GET /healthz` returns `{"status":"healthy"}`. Also set
   **`VOUCHER_BASE_URL`** on this node to the main host's voucher-service over the private
   network (e.g. `http://10.x.x.x:3611`) — bots default to it for TrueMoney redeem, and
   the loopback `127.0.0.1:3611` only exists on the main host. (Run one shared
   voucher-service on the main host; other nodes just need to reach it.)
3. **Register** it from the admin UI (or `POST /api/admin/vps-nodes`) with `orchestratorUrl`,
   `serviceToken`, and `maxSlots`. The backend **health-probes the orchestrator before it
   will accept the node as `ACTIVE`** — if it's not up yet, register it as `OFFLINE`, bring
   it up, then `PATCH` it to `ACTIVE`.
4. **Verify** with `GET /api/admin/vps-nodes/{id}/health` — returns `reachable` plus
   `maxSlots` / `usedSlots` / `freeSlots` for that host.

> The primary shared VPS leaves `orchestratorUrl`/`serviceToken` NULL and uses the
> backend's default `runtime.*` env — it isn't health-probed by the register flow.

**Logs:** `docker compose -p fujipp logs -f backend` (or `billing`).

**Renew TLS:** automatic via the certbot systemd timer; force with `certbot renew`.

---

## ⚠️ Security

The credentials originally shared in chat are considered exposed. After setup:

1. **Change the VPS root password** and prefer key-only SSH (`PasswordAuthentication no`).
2. **Change the DirectAdmin / FTP password.**
3. Rotate `BILLING_SERVICE_TOKEN`, SlipOK keys, and the Supabase DB password if they were ever shared in plaintext.
4. Never commit real `.env` files — only the GitHub secrets above hold real values.
