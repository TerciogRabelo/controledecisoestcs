
-- Set search_path on trigger helpers
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.set_registros_atualizado_em() SET search_path = public;
ALTER FUNCTION public.set_deliberacoes_atualizado_em() SET search_path = public;
ALTER FUNCTION public.recompute_registro_counts() SET search_path = public;

-- Revoke broad EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
