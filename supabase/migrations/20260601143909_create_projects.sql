CREATE TABLE IF NOT EXISTS public.project_gallery (
    id         UUID        PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    project_id UUID        NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
    sort_order INTEGER     NOT NULL,
    image_path TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT project_gallery_sort_order_check CHECK (sort_order >= 0),
    CONSTRAINT project_gallery_project_sort_unique UNIQUE (project_id, sort_order)
);

CREATE TABLE IF NOT EXISTS public.project_links (
    id         UUID        PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    project_id UUID        NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
    link_type  TEXT        NOT NULL,
    url        TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT project_links_type_check CHECK (link_type IN ('github', 'youtube')),
    CONSTRAINT project_links_project_type_unique UNIQUE (project_id, link_type)
);

CREATE INDEX IF NOT EXISTS project_gallery_project_id_idx
    ON public.project_gallery (project_id, sort_order);

CREATE INDEX IF NOT EXISTS project_links_project_id_idx
    ON public.project_links (project_id);

ALTER TABLE public.project_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.project_gallery, public.project_links TO anon, authenticated;
GRANT ALL ON public.project_gallery, public.project_links TO service_role;

DROP POLICY IF EXISTS "project_gallery_select_public" ON public.project_gallery;
CREATE POLICY "project_gallery_select_public"
    ON public.project_gallery
    FOR SELECT
    TO anon, authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "project_links_select_public" ON public.project_links;
CREATE POLICY "project_links_select_public"
    ON public.project_links
    FOR SELECT
    TO anon, authenticated
    USING (TRUE);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-assets',
    'project-assets',
    TRUE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "project_assets_select_public" ON storage.objects;
CREATE POLICY "project_assets_select_public"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'project-assets');

DROP POLICY IF EXISTS "project_assets_insert_admin" ON storage.objects;
CREATE POLICY "project_assets_insert_admin"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'project-assets'
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "project_assets_update_admin" ON storage.objects;
CREATE POLICY "project_assets_update_admin"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'project-assets'
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.role = 'ADMIN'
        )
    )
    WITH CHECK (
        bucket_id = 'project-assets'
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "project_assets_delete_admin" ON storage.objects;
CREATE POLICY "project_assets_delete_admin"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'project-assets'
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.role = 'ADMIN'
        )
    );
