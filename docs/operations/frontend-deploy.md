# Frontend Deploy Operations

The frontend deploys from `main` through `.github/workflows/frontend-deploy.yml`.
It builds `frontend/` with Bun and uploads the current `dist/` files to the
DirectAdmin shared host over FTP.

## Trigger

- Automatic: push to `main` touching `frontend/**` or the frontend deploy workflow.
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
