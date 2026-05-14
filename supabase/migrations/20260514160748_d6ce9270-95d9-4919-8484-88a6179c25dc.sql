-- processos_relacionados
DROP POLICY IF EXISTS "auth view pr" ON public.processos_relacionados;
CREATE POLICY "approved view pr" ON public.processos_relacionados
  FOR SELECT TO authenticated USING (public.is_approved_user());

-- processos
DROP POLICY IF EXISTS "Aprovados podem ver processos" ON public.processos;
CREATE POLICY "approved view processos" ON public.processos
  FOR SELECT TO authenticated USING (public.is_approved_user());

-- orgaos_julgadores
DROP POLICY IF EXISTS "auth view orgaos_julgadores" ON public.orgaos_julgadores;
CREATE POLICY "approved view orgaos_julgadores" ON public.orgaos_julgadores
  FOR SELECT TO authenticated USING (public.is_approved_user());

-- tipos_decisao
DROP POLICY IF EXISTS "auth view tipos_decisao" ON public.tipos_decisao;
CREATE POLICY "approved view tipos_decisao" ON public.tipos_decisao
  FOR SELECT TO authenticated USING (public.is_approved_user());

-- tipos_julgamento
DROP POLICY IF EXISTS "auth view tipos_julgamento" ON public.tipos_julgamento;
CREATE POLICY "approved view tipos_julgamento" ON public.tipos_julgamento
  FOR SELECT TO authenticated USING (public.is_approved_user());

-- tipos_deliberacao
DROP POLICY IF EXISTS "auth view tipos_deliberacao" ON public.tipos_deliberacao;
CREATE POLICY "approved view tipos_deliberacao" ON public.tipos_deliberacao
  FOR SELECT TO authenticated USING (public.is_approved_user());

-- resultados_monitoramento
DROP POLICY IF EXISTS "auth view resultados_monitoramento" ON public.resultados_monitoramento;
CREATE POLICY "approved view resultados_monitoramento" ON public.resultados_monitoramento
  FOR SELECT TO authenticated USING (public.is_approved_user());

-- status_monitoramento_options
DROP POLICY IF EXISTS "auth view smo" ON public.status_monitoramento_options;
CREATE POLICY "approved view smo" ON public.status_monitoramento_options
  FOR SELECT TO authenticated USING (public.is_approved_user());

-- unidades_gestoras
DROP POLICY IF EXISTS "auth view unidades_gestoras" ON public.unidades_gestoras;
CREATE POLICY "approved view unidades_gestoras" ON public.unidades_gestoras
  FOR SELECT TO authenticated USING (public.is_approved_user());

-- unidades_tecnicas
DROP POLICY IF EXISTS "auth view ut" ON public.unidades_tecnicas;
CREATE POLICY "approved view ut" ON public.unidades_tecnicas
  FOR SELECT TO authenticated USING (public.is_approved_user());
