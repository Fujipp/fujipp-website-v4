ALTER TABLE public.project_translations
    ADD COLUMN IF NOT EXISTS what_i_learned_title TEXT NOT NULL DEFAULT '';
