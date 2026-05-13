CREATE TYPE public.fonte_tipo_alvo AS ENUM (
  'processos',
  'unidades_gestoras',
  'orgaos_julgadores',
  'tipos_decisao',
  'tipos_julgamento',
  'tipos_deliberacao'
);

CREATE TABLE public.fontes_dados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo_alvo public.fonte_tipo_alvo NOT NULL,
  url text NOT NULL,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  caminho_lista text,
  campo_label text NOT NULL DEFAULT 'label',
  campo_valor text NOT NULL DEFAULT 'value',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fontes_dados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth view fontes" ON public.fontes_dados FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit ins fontes" ON public.fontes_dados FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'secretaria'::app_role]));
CREATE POLICY "edit upd fontes" ON public.fontes_dados FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'secretaria'::app_role]));
CREATE POLICY "admin del fontes" ON public.fontes_dados FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_fontes_dados_updated_at BEFORE UPDATE ON public.fontes_dados
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();