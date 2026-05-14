-- 1) Vincular profile a unidade técnica (necessário para perfil 'monitoramento')
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unidade_tecnica_id uuid REFERENCES public.unidades_tecnicas(id) ON DELETE SET NULL;

-- 2) Helper: retorna a unidade técnica do usuário autenticado
CREATE OR REPLACE FUNCTION public.current_user_unidade_tecnica()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unidade_tecnica_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 3) Refazer RLS de deliberacoes
DROP POLICY IF EXISTS "edit ins del" ON public.deliberacoes;
DROP POLICY IF EXISTS "edit upd del" ON public.deliberacoes;
DROP POLICY IF EXISTS "admin del del" ON public.deliberacoes;

-- INSERT: apenas admin e secretaria criam deliberações
CREATE POLICY "ins deliberacoes admin/secretaria"
ON public.deliberacoes
FOR INSERT
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'secretaria'::app_role]));

-- UPDATE admin/secretaria: livre
CREATE POLICY "upd deliberacoes admin/secretaria"
ON public.deliberacoes
FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'secretaria'::app_role]));

-- UPDATE monitoramento: só quando deliberação está vinculada à UT do usuário
CREATE POLICY "upd deliberacoes monitoramento"
ON public.deliberacoes
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'monitoramento'::app_role)
  AND unidade_tecnica_id IS NOT NULL
  AND unidade_tecnica_id = public.current_user_unidade_tecnica()
);

-- DELETE: apenas admin
CREATE POLICY "del deliberacoes admin"
ON public.deliberacoes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));