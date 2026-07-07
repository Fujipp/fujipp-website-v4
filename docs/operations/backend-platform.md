# Backend Platform Operations

Normal backend and service releases go through the GitHub Actions workflow
`.github/workflows/backend-platform.yml`.

## Production Host

- Hostname: `FujippBackend`
- App directory: `/opt/fujipp/apps/backend-platform`
- Env file: `/opt/fujipp/env/platform.env`
- Compose project: `fujipp-backend-platform`

## Common Checks

```bash
cd /opt/fujipp/apps/backend-platform
docker compose --env-file /opt/fujipp/env/platform.env ps
curl -fsS http://127.0.0.1:3600/api/public/health
curl -fsS http://127.0.0.1:8090/healthz
```

## Service Logs

```bash
cd /opt/fujipp/apps/backend-platform
docker compose --env-file /opt/fujipp/env/platform.env logs --tail=160 backend
docker compose --env-file /opt/fujipp/env/platform.env logs --tail=160 billing
docker compose --env-file /opt/fujipp/env/platform.env logs --tail=160 voucher
docker compose --env-file /opt/fujipp/env/platform.env logs --tail=160 runtime
```

## Related Files

- Compose baseline: `infrastructure/backend-platform/compose.yml`
- Env template: `infrastructure/backend-platform/env.example`
- Host notes: `infrastructure/backend-platform/README.md`
- Secrets inventory: `docs/operations/secrets-inventory.md`
