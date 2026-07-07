# Database Reference

Read `.agents/scopes/database.md` before schema work. Use Supabase skills for Supabase-specific tasks.

## Source Of Truth

- Migrations live in `supabase/migrations/`.
- Do not edit applied migrations; add a new migration.
- Backend JPA validates schema and never creates/updates it.
- Schema changes that affect backend must update migration and entity/query mapping together.

## Supabase Connection Pattern

- Main backend uses Supabase transaction pooler on port `6543`.
- URLs must include `sslmode=require` and `prepareThreshold=0`.
- Keep Hikari pools modest; do not switch back to session pooler without understanding connection limits.

## Security

- Enable RLS for user-facing tables in exposed schemas.
- Policies must encode ownership/admin rules, not only `TO authenticated`.
- Never expose service-role credentials to frontend code.
- Avoid `SECURITY DEFINER`; if unavoidable, keep it reviewed, private where possible, and least-privilege.
- Views exposed to users must not bypass RLS; use `security_invoker` where appropriate.

## Change Discipline

- Add constraints/defaults/indexes that match backend assumptions.
- Index foreign keys and common lookup paths.
- For money, wallet, subscription, bot ownership, and audit records, prefer database constraints and transactional updates.
- For existing data changes, include deliberate backfill/update SQL and note reversibility.
