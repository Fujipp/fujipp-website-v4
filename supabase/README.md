# Supabase database workflow

This directory is the source of truth for database schema changes deployed by
the Supabase GitHub integration. The Spring Boot backend connects to the hosted
Postgres database, but it does not create schema because it uses
`spring.jpa.hibernate.ddl-auto=validate`.

## Initial baseline

Before enabling **Deploy to production** in the Supabase dashboard, pull the
current remote `public` schema into this repository. Use the Session pooler
connection details from **Supabase Dashboard > Connect** and keep credentials
outside Git.

```bash
export SUPABASE_DB_URL='postgresql://postgres.<project-ref>@<pooler-host>:5432/postgres?sslmode=require'
export SUPABASE_DB_PASSWORD='<database-password>'
supabase db pull initial_schema \
  --db-url "$SUPABASE_DB_URL" \
  --password "$SUPABASE_DB_PASSWORD" \
  --schema public
```

Commit the generated migration under `supabase/migrations/` before enabling
production deployment. In the GitHub integration settings, use `.` as the
working directory because this `supabase/` directory is at the repository
root.

## Making schema changes

Create one new migration for each schema change:

```bash
supabase migration new create_profiles
```

Edit the generated SQL file, test it against a local or preview database, and
commit it with the backend code that uses the schema. Do not edit a migration
that has already been deployed; create a follow-up migration instead.

For tables exposed through Supabase Data API, enable Row Level Security and
add policies before allowing frontend access. The current backend connection
uses JDBC directly, so frontend code should continue to call backend APIs
unless a Data API/Auth design is intentionally added.

## GitHub integration rollout

1. Pull and commit the initial schema baseline.
2. Review migrations in pull requests.
3. Configure the production branch in Supabase GitHub Integration.
4. Enable **Deploy to production** only after the baseline is committed.
5. Require the Supabase status check before merges once preview branching is
   available.

`seed.sql` is for local and preview environments. The GitHub integration does
not deploy seed data to production by default.
