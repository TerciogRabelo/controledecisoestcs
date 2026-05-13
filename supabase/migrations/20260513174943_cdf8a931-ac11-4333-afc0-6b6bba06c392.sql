-- Unidades Técnicas Responsáveis
CREATE TABLE public.unidades_tecnicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unidades_tecnicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view ut" ON public.unidades_tecnicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit ins ut" ON public.unidades_tecnicas FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'secretaria'::app_role]));
CREATE POLICY "edit upd ut" ON public.unidades_tecnicas FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'secretaria'::app_role]));
CREATE POLICY "admin del ut" ON public.unidades_tecnicas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Enum
DO $$ BEGIN
  CREATE TYPE public.tipo_monitoramento AS ENUM ('processual','extraprocessual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Campos novos em deliberacoes
ALTER TABLE public.deliberacoes
  ADD COLUMN IF NOT EXISTS unidade_tecnica_id uuid,
  ADD COLUMN IF NOT EXISTS monitoramento_inicio date,
  ADD COLUMN IF NOT EXISTS monitoramento_fim date,
  ADD COLUMN IF NOT EXISTS monitoramento_tipo public.tipo_monitoramento,
  ADD COLUMN IF NOT EXISTS monitoramento_processo_origem boolean,
  ADD COLUMN IF NOT EXISTS monitoramento_numero_processo text;
