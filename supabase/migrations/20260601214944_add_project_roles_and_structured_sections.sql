CREATE TABLE IF NOT EXISTS public.project_roles (
    id         UUID        PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    project_id UUID        NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
    role       TEXT        NOT NULL,
    sort_order INTEGER     NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT project_roles_sort_order_check CHECK (sort_order >= 0),
    CONSTRAINT project_roles_project_role_unique UNIQUE (project_id, role),
    CONSTRAINT project_roles_project_sort_unique UNIQUE (project_id, sort_order)
);

CREATE TABLE IF NOT EXISTS public.project_challenge_translations (
    id         UUID           PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    project_id UUID           NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
    locale     project_locale NOT NULL,
    sort_order INTEGER        NOT NULL,
    title      TEXT           NOT NULL DEFAULT '',
    content    TEXT           NOT NULL,
    created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT project_challenge_translations_sort_order_check CHECK (sort_order >= 0),
    CONSTRAINT project_challenge_translations_project_locale_sort_unique
        UNIQUE (project_id, locale, sort_order)
);

ALTER TABLE public.project_learning_translations
    ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';

INSERT INTO public.project_challenge_translations (project_id, locale, sort_order, content)
SELECT project_id, locale, 1, challenges
FROM public.project_translations
WHERE NULLIF(BTRIM(challenges), '') IS NOT NULL
ON CONFLICT (project_id, locale, sort_order) DO NOTHING;

CREATE INDEX IF NOT EXISTS project_roles_project_id_idx
    ON public.project_roles (project_id, sort_order);

CREATE INDEX IF NOT EXISTS project_challenge_translations_project_id_idx
    ON public.project_challenge_translations (project_id, locale, sort_order);

ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_challenge_translations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.project_roles, public.project_challenge_translations TO anon, authenticated;
GRANT ALL ON public.project_roles, public.project_challenge_translations TO service_role;

DROP POLICY IF EXISTS "project_roles_select_public" ON public.project_roles;
CREATE POLICY "project_roles_select_public"
    ON public.project_roles
    FOR SELECT
    TO anon, authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "project_challenge_translations_select_public"
    ON public.project_challenge_translations;
CREATE POLICY "project_challenge_translations_select_public"
    ON public.project_challenge_translations
    FOR SELECT
    TO anon, authenticated
    USING (TRUE);
