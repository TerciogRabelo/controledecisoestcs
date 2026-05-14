
-- 1. Fix self-update profile to prevent privilege escalation
DROP POLICY IF EXISTS "self update profile" ON public.profiles;
CREATE POLICY "self update profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND aprovado = (SELECT p.aprovado FROM public.profiles p WHERE p.id = auth.uid())
    AND is_master = (SELECT p.is_master FROM public.profiles p WHERE p.id = auth.uid())
    AND tribunal_id IS NOT DISTINCT FROM (SELECT p.tribunal_id FROM public.profiles p WHERE p.id = auth.uid())
    AND unidade_tecnica_id IS NOT DISTINCT FROM (SELECT p.unidade_tecnica_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 2. Tighten audit_log: only allow inserts attributed to self with limited tabela values; prevent log forging by removing client insert (server functions use service role)
DROP POLICY IF EXISTS "auth ins audit" ON public.audit_log;
-- Only admins (server-side use uses service role and bypasses RLS)
CREATE POLICY "admin ins audit" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND usuario_id = auth.uid());

-- 3. Restrict fontes_dados (contains credentials in headers) to admin only
DROP POLICY IF EXISTS "admin/secretaria view fontes" ON public.fontes_dados;
CREATE POLICY "admin view fontes" ON public.fontes_dados
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "edit ins fontes" ON public.fontes_dados;
CREATE POLICY "admin ins fontes" ON public.fontes_dados
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "edit upd fontes" ON public.fontes_dados;
CREATE POLICY "admin upd fontes" ON public.fontes_dados
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Restrict deliberacao-anexos storage bucket SELECT to approved users
DROP POLICY IF EXISTS "auth view anexos" ON storage.objects;
CREATE POLICY "approved view anexos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'deliberacao-anexos' AND public.is_approved_user());
