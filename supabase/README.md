# Supabase Database Workflow

This directory stores PostgreSQL schema migrations for the Fujipp platform.
The backend and services validate/use this schema; they do not create it through
JPA or application startup.

Read `../docs/operations/database.md` for the current schema map, wallet layers,
runtime slot model, feature config model, and debugging entry points.

## Branch Model

Production migrations are staged on the persistent branch:

```text
db/migrations
```

Use this branch for migration work. `main` keeps the source-of-truth files, but
merging to `main` is not the production apply step.

## Creating A Migration

```bash
supabase migration new add_example_table
```

Rules:

- one schema change per migration file,
- never edit or delete a migration that has already been applied,
- keep filenames timestamped and descriptive,
- include RLS/policies for user-facing tables,
- update matching backend/service entities in the same feature work when needed.

## Applying Migrations

Do not run `supabase db push` against production from a local shell. Production
apply should happen through the manual migration process/workflow once prepared.

`supabase db push` and `supabase migration up` are acceptable only for local or
explicitly linked development databases.

## Seed Data

`seed.sql` is for local and preview environments. Production reference data
should be added deliberately through migrations or an explicit operator process.
