create type public.project_category as enum (
  'Client Project',
  'Senior Project',
  'Internship Project',
  'Personal Project',
  'Open Source',
  'Experimental',
  'Team Project',
  'Startup'
);

create type public.project_status as enum (
  'Active',
  'Completed',
  'In Progress',
  'Archived'
);

create type public.project_tech_stack_group as enum (
  'language',
  'frontend',
  'backend',
  'database',
  'external_service',
  'devops'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  display_order integer not null,
  slug text not null unique,
  project_name text not null,
  description_short text not null,
  description text,
  category public.project_category not null,
  status public.project_status not null default 'In Progress',
  is_featured boolean not null default false,
  featured_order integer,
  thumbnail_path text,
  architecture_image_path text,
  overview_core_roles integer,
  overview_challenge_areas integer,
  overview_stack_group integer,
  overview_target_users text,
  overview_feasibility text,
  challenges text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_display_order_positive check (display_order > 0),
  constraint projects_featured_order_required check (
    is_featured = false or featured_order is not null
  )
);

create table public.project_features (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sort_order integer not null,
  feature text not null,
  created_at timestamptz not null default now(),
  unique (project_id, sort_order),
  constraint project_features_sort_order_positive check (sort_order > 0)
);

create table public.project_learnings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sort_order integer not null,
  learning text not null,
  created_at timestamptz not null default now(),
  unique (project_id, sort_order),
  constraint project_learnings_sort_order_positive check (sort_order > 0)
);

create table public.project_tech_stack (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stack_group public.project_tech_stack_group not null,
  name text not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  unique (project_id, stack_group, name),
  constraint project_tech_stack_sort_order_positive check (sort_order > 0)
);

create index projects_public_table_idx
  on public.projects (is_published, display_order);

create index projects_featured_idx
  on public.projects (is_featured, featured_order)
  where is_featured = true and is_published = true;

create index projects_category_status_idx
  on public.projects (category, status);

create index project_features_project_idx
  on public.project_features (project_id, sort_order);

create index project_learnings_project_idx
  on public.project_learnings (project_id, sort_order);

create index project_tech_stack_project_idx
  on public.project_tech_stack (project_id, stack_group, sort_order);

alter table public.projects enable row level security;
alter table public.project_features enable row level security;
alter table public.project_learnings enable row level security;
alter table public.project_tech_stack enable row level security;

grant select on public.projects to anon, authenticated;
grant select on public.project_features to anon, authenticated;
grant select on public.project_learnings to anon, authenticated;
grant select on public.project_tech_stack to anon, authenticated;

grant all on public.projects to service_role;
grant all on public.project_features to service_role;
grant all on public.project_learnings to service_role;
grant all on public.project_tech_stack to service_role;

create policy "Public can read published projects"
  on public.projects
  for select
  to anon, authenticated
  using (is_published = true);

create policy "Public can read features for published projects"
  on public.project_features
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_features.project_id
        and projects.is_published = true
    )
  );

create policy "Public can read learnings for published projects"
  on public.project_learnings
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_learnings.project_id
        and projects.is_published = true
    )
  );

create policy "Public can read tech stack for published projects"
  on public.project_tech_stack
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_tech_stack.project_id
        and projects.is_published = true
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read project assets"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'project-assets');
