# Frontend Deploy Operations

The frontend deploys from `main` through `.github/workflows/frontend-deploy.yml`.
It builds `frontend/` with Bun and uploads the current `dist/` files to the
DirectAdmin shared host over FTP.

## Trigger

- Automatic: push to `main` touching deployable frontend source under `frontend/**`.
- Manual: run **Deploy Frontend** from GitHub Actions.

## Production Environment

The production build reads `FRONTEND_ENV_FILE` from GitHub Actions secrets.
The deployed app should call:

```dotenv
VITE_API_BASE_URL=https://api.fujipp.com
```

## Notes

- The shared host does not support SSH deploys.
- The workflow uploads hashed assets before `index.html` to avoid a white-screen
  window while chunks are still uploading.
- Old hashed chunks stay on the host intentionally so cached pages can keep loading.
- FTP mirroring ignores checkout timestamps and compares file sizes, preventing
  unchanged files from being removed and uploaded again on every deployment.
- Vite JS/CSS assets are content-hashed, so changed bundles always have a new name.
  For a stable file under `frontend/public/`, avoid replacing it with different
  content of exactly the same byte size; rename it or change its size so FTP can
  detect the update.
