-- Resultados de monitoramento (catálogo básico)
CREATE TABLE public.resultados_monitoramento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao text NOT NULL UNIQUE,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.resultados_monitoramento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth view resultados_monitoramento" ON public.resultados_monitoramento
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit ins resultados_monitoramento" ON public.resultados_monitoramento
  FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'secretaria'::app_role]));
CREATE POLICY "edit upd resultados_monitoramento" ON public.resultados_monitoramento
  FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'secretaria'::app_role]));
CREATE POLICY "admin del resultados_monitoramento" ON public.resultados_monitoramento
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.resultados_monitoramento (descricao, ordem) VALUES
  ('Implementado', 1),
  ('Implementado parcialmente', 2),
  ('Não implementado', 3);

-- Vínculo estruturado em deliberacoes
ALTER TABLE public.deliberacoes ADD COLUMN resultado_monitoramento_id uuid REFERENCES public.resultados_monitoramento(id);

-- Anexos no registro de decisão (acórdãos etc.)
ALTER TABLE public.registros_decisao ADD COLUMN anexos jsonb NOT NULL DEFAULT '[]'::jsonb;