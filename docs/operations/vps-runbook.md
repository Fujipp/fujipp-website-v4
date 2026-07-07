# VPS Runbook

Quick commands for the current Backend Platform VPS.

## Status

```bash
hostnamectl
free -h
df -h
docker stats --no-stream
sudo ufw status verbose
sudo systemctl status nginx --no-pager
```

## Backend Platform

```bash
cd /opt/fujipp/apps/backend-platform
docker compose --env-file /opt/fujipp/env/platform.env ps
docker compose --env-file /opt/fujipp/env/platform.env logs --tail=120 runtime
```

## Restart One Bot

```bash
cd /opt/fujipp/apps/backend-platform
. /opt/fujipp/env/platform.env

curl -sS -X POST http://127.0.0.1:8090/bots/BOT_ID/stop \
  -H "X-Service-Token: $RUNTIME_SERVICE_TOKEN"

curl -sS -X POST http://127.0.0.1:8090/bots/BOT_ID/start \
  -H "X-Service-Token: $RUNTIME_SERVICE_TOKEN"
```

Replace `BOT_ID` with the bot instance id from `bots.bot_instances`.
