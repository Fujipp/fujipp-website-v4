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

- Production migrations are staged on the persistent `db/migrations` branch and
  applied deliberately through the manual database migration process. Do not rely
  on `main` to auto-apply Supabase migrations.
- For normal database work, branch from `db/migrations`, add the migration under
  `supabase/migrations/`, then merge back into `db/migrations` or open a focused
  `db/<topic>` branch for larger schema work.
- Merging migration files into `main` is for source-of-truth/history only. It must
  not be treated as the production apply step.
- Do NOT tell the user to run `supabase db push` against production. `supabase db push`
  / `supabase migration up` are only for local or explicitly linked dev databases.
- One change per migration file, named `supabase/migrations/<timestamp>_<description>.sql`
  (timestamp `YYYYMMDDHHMMSS`, lower_snake_case description). Keep the timestamp order intact.
- Migrations are **append-only** — never edit or delete a migration that has already been applied/pushed.
  To change something, add a new migration.
- After changing the schema, update the matching backend JPA entity (`model/`) in the **same** change set,
  or `ddl-auto=validate` will fail on the next backend start.
- Do not use JPA/Hibernate as the schema author. The database migration is the source of truth.
- Keep migrations small enough that a reviewer can understand the product reason and rollback risk.

## Spring Boot Alignment

- Any table/column used by `backend/` must have a matching Java entity, repository query, or explicit SQL mapping.
- If a backend DTO or service assumes a constraint, default, enum, or status value, enforce it in the migration too.
- For money, wallet, subscription, bot ownership, or audit data, prefer constraints and transactional updates over
  "trust the application" only.
- If a migration affects existing rows, include a deliberate backfill/update step and document whether it is reversible.

## Conventions

- `lower_snake_case` for tables and columns; singular vs plural — follow the existing tables.
- Every table: primary key, sensible constraints/defaults, and an index on each foreign key.
- **Row Level Security (RLS)** is the default for user-facing tables — enable it and write explicit
  policies. Admin-only data is gated by the profile role (see the auth profiles migrations).

## Supabase Security

- Never expose service-role credentials to frontend code.
- Do not use user-editable metadata for authorization decisions.
- Views exposed to users must not bypass RLS; use `security_invoker` where appropriate or keep the view private.
- RLS policies must encode ownership/admin rules, not just `TO authenticated`.
- Security-definer functions require extra review and should not be used simply to bypass a permission error.

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
