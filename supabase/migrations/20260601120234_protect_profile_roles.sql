-- Keep authorization roles explicit and prevent authenticated users from
-- escalating their own role through the public profiles Data API.
UPDATE public.profiles
SET role = UPPER(role)
WHERE role <> UPPER(role);

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('USER', 'ADMIN'));

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
    username,
    display_name,
    avatar_url,
    bio,
    website,
    github_url
) ON public.profiles TO authenticated;
