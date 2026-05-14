
-- Helper: is current user approved
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT aprovado FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- ===== profiles =====
DROP POLICY IF EXISTS "auth view profiles" ON public.profiles;
CREATE POLICY "self or admin view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role));

-- ===== user_roles =====
DROP POLICY IF EXISTS "auth view roles" ON public.user_roles;
CREATE POLICY "self or admin view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- ===== fontes_dados (URLs + headers possibly with credentials) =====
DROP POLICY IF EXISTS "auth view fontes" ON public.fontes_dados;
CREATE POLICY "admin/secretaria view fontes"
  ON public.fontes_dados FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'secretaria'::app_role]));

-- ===== registros_decisao (CPF/CNPJ + sensitive legal data) =====
DROP POLICY IF EXISTS "auth view rd" ON public.registros_decisao;
CREATE POLICY "approved view rd"
  ON public.registros_decisao FOR SELECT
  TO authenticated
  USING (public.is_approved_user());

-- ===== deliberacoes (manager responses, monitoring data) =====
DROP POLICY IF EXISTS "auth view del" ON public.deliberacoes;
CREATE POLICY "approved view del"
  ON public.deliberacoes FOR SELECT
  TO authenticated
  USING (public.is_approved_user());
