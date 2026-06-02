-- ─── Helper: check username availability ──────────────────────────────────────
-- Called by anon before registration to give real-time feedback.
-- Returns TRUE if the username is free.
CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(p_username)
  );
$$;

REVOKE ALL ON FUNCTION public.is_username_available(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_username_available(TEXT) TO anon, authenticated;
