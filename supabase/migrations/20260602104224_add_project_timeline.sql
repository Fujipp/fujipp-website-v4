ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS timeline_start_date TEXT,
    ADD COLUMN IF NOT EXISTS timeline_end_date TEXT,
    ADD COLUMN IF NOT EXISTS timeline_status TEXT NOT NULL DEFAULT 'Completed';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'projects_timeline_start_date_check'
    ) THEN
        ALTER TABLE public.projects
            ADD CONSTRAINT projects_timeline_start_date_check
            CHECK (timeline_start_date IS NULL OR timeline_start_date ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'projects_timeline_end_date_check'
    ) THEN
        ALTER TABLE public.projects
            ADD CONSTRAINT projects_timeline_end_date_check
            CHECK (timeline_end_date IS NULL OR timeline_end_date ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'projects_timeline_status_check'
    ) THEN
        ALTER TABLE public.projects
            ADD CONSTRAINT projects_timeline_status_check
            CHECK (timeline_status IN ('Completed', 'In Progress', 'On Hold'));
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.project_timeline_milestones (
    id          UUID        PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    project_id  UUID        NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
    sort_order  INTEGER     NOT NULL,
    date        TEXT        NOT NULL,
    title       TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT project_timeline_milestones_sort_order_check CHECK (sort_order >= 0),
    CONSTRAINT project_timeline_milestones_date_check
        CHECK (date ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT project_timeline_milestones_project_sort_unique
        UNIQUE (project_id, sort_order)
);

CREATE INDEX IF NOT EXISTS project_timeline_milestones_project_id_idx
    ON public.project_timeline_milestones (project_id, sort_order);

ALTER TABLE public.project_timeline_milestones ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.project_timeline_milestones TO anon, authenticated;
GRANT ALL ON public.project_timeline_milestones TO service_role;

DROP POLICY IF EXISTS "project_timeline_milestones_select_public"
    ON public.project_timeline_milestones;
CREATE POLICY "project_timeline_milestones_select_public"
    ON public.project_timeline_milestones
    FOR SELECT
    TO anon, authenticated
    USING (TRUE);
