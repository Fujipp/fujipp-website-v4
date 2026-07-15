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
- Deployment does not use FTP mirroring, so it never scans the growing remote file
  history. A small SHA-256 manifest selects only build and public files whose
  content changed since the last verified release.
- Changed assets and the entry chunk are downloaded back in one FTP session and
  byte-compared before `index.html` is flipped. Missing or dropped files are
  re-uploaded; unchanged assets retain their earlier verification result.
- Stable public files are compared by content hash, so same-size edits are detected
  while unchanged files are not removed or transferred.
