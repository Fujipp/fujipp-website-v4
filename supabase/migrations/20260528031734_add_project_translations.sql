create type public.project_locale as enum (
  'en',
  'th'
);

create table public.project_translations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  locale public.project_locale not null,
  project_name text not null,
  description_short text not null,
  description text,
  overview_target_users text,
  overview_feasibility text,
  challenges text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, locale)
);

create table public.project_feature_translations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  locale public.project_locale not null,
  sort_order integer not null,
  feature text not null,
  created_at timestamptz not null default now(),
  unique (project_id, locale, sort_order),
  constraint project_feature_translations_sort_order_positive check (sort_order > 0)
);

create table public.project_learning_translations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  locale public.project_locale not null,
  sort_order integer not null,
  learning text not null,
  created_at timestamptz not null default now(),
  unique (project_id, locale, sort_order),
  constraint project_learning_translations_sort_order_positive check (sort_order > 0)
);

create index project_translations_project_locale_idx
  on public.project_translations (project_id, locale);

create index project_feature_translations_project_locale_idx
  on public.project_feature_translations (project_id, locale, sort_order);

create index project_learning_translations_project_locale_idx
  on public.project_learning_translations (project_id, locale, sort_order);

alter table public.project_translations enable row level security;
alter table public.project_feature_translations enable row level security;
alter table public.project_learning_translations enable row level security;

grant select on public.project_translations to anon, authenticated;
grant select on public.project_feature_translations to anon, authenticated;
grant select on public.project_learning_translations to anon, authenticated;

grant all on public.project_translations to service_role;
grant all on public.project_feature_translations to service_role;
grant all on public.project_learning_translations to service_role;

create policy "Public can read translations for published projects"
  on public.project_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_translations.project_id
        and projects.is_published = true
    )
  );

create policy "Public can read feature translations for published projects"
  on public.project_feature_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_feature_translations.project_id
        and projects.is_published = true
    )
  );

create policy "Public can read learning translations for published projects"
  on public.project_learning_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_learning_translations.project_id
        and projects.is_published = true
    )
  );
