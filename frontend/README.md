# Fujipp Frontend

Vue 3 + TypeScript + Vite frontend for Fujipp's portfolio and Discord bot shop.

## Read First

- Repo rules: `../.agents/README.md`
- Frontend rules: `AGENTS.md`
- Design system: `docs/design-system.md`
- Component guide: `docs/component-guidelines.md`

## Local Commands

```bash
bun install
bun run dev
```

Builds, type checks, and browser verification should only be run when the task
explicitly asks for verification.

## Environment

Frontend env files contain only public browser config:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_TARGET=host
VITE_API_LOCAL_URL=http://localhost:8080
VITE_API_HOST_URL=https://api.fujipp.com
```

Production builds use `FRONTEND_ENV_FILE` from GitHub Actions.
