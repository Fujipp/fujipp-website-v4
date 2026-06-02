ALTER TABLE public.project_links
    DROP CONSTRAINT IF EXISTS project_links_type_check;

ALTER TABLE public.project_links
    ADD CONSTRAINT project_links_type_check
    CHECK (link_type IN ('github', 'youtube', 'certificate', 'figma'));
