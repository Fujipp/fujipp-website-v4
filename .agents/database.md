# Database Rules

Read this file before changing anything under `supabase/` or any schema/SQL.

---

## Stack

| | |
| --- | --- |
| Database | Supabase PostgreSQL |
| Schema source of truth | `supabase/migrations/` (timestamped SQL migrations) |
| Local seed | `supabase/seed.sql` |
| CLI config | `supabase/config.toml` |

The backend (`backend/`) connects to this database with `ddl-auto=validate` — it **reads** the
schema, it never creates or alters it. **All schema changes go through a migration here**, not JPA.

---

## Migrations

- One change per migration file, named `supabase/migrations/<timestamp>_<description>.sql`
  (timestamp `YYYYMMDDHHMMSS`, lower_snake_case description). Keep the timestamp order intact.
- Migrations are **append-only** — never edit or delete a migration that has already been applied/pushed.
  To change something, add a new migration.
- After changing the schema, update the matching backend JPA entity (`model/`) in the **same** change set,
  or `ddl-auto=validate` will fail on the next backend start.

## Conventions

- `lower_snake_case` for tables and columns; singular vs plural — follow the existing tables.
- Every table: primary key, sensible constraints/defaults, and an index on each foreign key.
- **Row Level Security (RLS)** is the default for user-facing tables — enable it and write explicit
  policies. Admin-only data is gated by the profile role (see the auth profiles migrations).

## Best practices skill

For indexing, query patterns, connection pooling, locking, and RLS performance, follow
`.agents/skills/supabase-postgres-best-practices/`. Notably:

- The app uses the **transaction-mode pooler (port 6543)** — see `references/conn-pooling.md`
  and `references/conn-prepared-statements.md` (this is why the backend sets `prepareThreshold=0`).

---

## Do Not

- Do not edit or remove an already-applied migration — add a new one.
- Do not change the schema without a migration, and without updating the backend entity to match.
- Do not commit real connection strings or secrets — those live in `backend/.env` (git-ignored).
- Do not disable RLS on user-facing tables to "make it work".
