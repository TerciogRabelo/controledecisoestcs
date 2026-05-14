
-- 1) Prazo facultativo em tipos_deliberacao
ALTER TABLE public.tipos_deliberacao
  ADD COLUMN IF NOT EXISTS prazo_facultativo boolean NOT NULL DEFAULT false;

-- 2) Tribunais (multi-tenant cadastral; sem RLS de segmentação ainda)
CREATE TABLE IF NOT EXISTS public.tribunais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla text NOT NULL UNIQUE,
  nome text NOT NULL,
  esfera text NOT NULL DEFAULT 'estadual', -- federal | estadual | distrital | municipal_estadual | municipal
  logo_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tribunais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth view tribunais" ON public.tribunais FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin ins tribunais" ON public.tribunais FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin upd tribunais" ON public.tribunais FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin del tribunais" ON public.tribunais FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tribunais_updated_at BEFORE UPDATE ON public.tribunais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Profiles: tribunal_id e is_master
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tribunal_id uuid REFERENCES public.tribunais(id),
  ADD COLUMN IF NOT EXISTS is_master boolean NOT NULL DEFAULT false;

-- Bucket público para logos
INSERT INTO storage.buckets (id, name, public)
  VALUES ('tribunal-logos', 'tribunal-logos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read tribunal-logos" ON storage.objects FOR SELECT
  USING (bucket_id = 'tribunal-logos');
CREATE POLICY "admin write tribunal-logos ins" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tribunal-logos' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write tribunal-logos upd" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tribunal-logos' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write tribunal-logos del" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tribunal-logos' AND has_role(auth.uid(), 'admin'));

-- Seed dos 33 tribunais
INSERT INTO public.tribunais (sigla, nome, esfera) VALUES
  ('TCU',     'Tribunal de Contas da União', 'federal'),
  ('TCE-AC',  'Tribunal de Contas do Estado do Acre', 'estadual'),
  ('TCE-AL',  'Tribunal de Contas do Estado de Alagoas', 'estadual'),
  ('TCE-AP',  'Tribunal de Contas do Estado do Amapá', 'estadual'),
  ('TCE-AM',  'Tribunal de Contas do Estado do Amazonas', 'estadual'),
  ('TCE-BA',  'Tribunal de Contas do Estado da Bahia', 'estadual'),
  ('TCE-CE',  'Tribunal de Contas do Estado do Ceará', 'estadual'),
  ('TCDF',    'Tribunal de Contas do Distrito Federal', 'distrital'),
  ('TCE-ES',  'Tribunal de Contas do Estado do Espírito Santo', 'estadual'),
  ('TCE-GO',  'Tribunal de Contas do Estado de Goiás', 'estadual'),
  ('TCE-MA',  'Tribunal de Contas do Estado do Maranhão', 'estadual'),
  ('TCE-MT',  'Tribunal de Contas do Estado de Mato Grosso', 'estadual'),
  ('TCE-MS',  'Tribunal de Contas do Estado de Mato Grosso do Sul', 'estadual'),
  ('TCE-MG',  'Tribunal de Contas do Estado de Minas Gerais', 'estadual'),
  ('TCE-PA',  'Tribunal de Contas do Estado do Pará', 'estadual'),
  ('TCE-PB',  'Tribunal de Contas do Estado da Paraíba', 'estadual'),
  ('TCE-PR',  'Tribunal de Contas do Estado do Paraná', 'estadual'),
  ('TCE-PE',  'Tribunal de Contas do Estado de Pernambuco', 'estadual'),
  ('TCE-PI',  'Tribunal de Contas do Estado do Piauí', 'estadual'),
  ('TCE-RJ',  'Tribunal de Contas do Estado do Rio de Janeiro', 'estadual'),
  ('TCE-RN',  'Tribunal de Contas do Estado do Rio Grande do Norte', 'estadual'),
  ('TCE-RS',  'Tribunal de Contas do Estado do Rio Grande do Sul', 'estadual'),
  ('TCE-RO',  'Tribunal de Contas do Estado de Rondônia', 'estadual'),
  ('TCE-RR',  'Tribunal de Contas do Estado de Roraima', 'estadual'),
  ('TCE-SC',  'Tribunal de Contas do Estado de Santa Catarina', 'estadual'),
  ('TCE-SP',  'Tribunal de Contas do Estado de São Paulo', 'estadual'),
  ('TCE-SE',  'Tribunal de Contas do Estado de Sergipe', 'estadual'),
  ('TCE-TO',  'Tribunal de Contas do Estado do Tocantins', 'estadual'),
  ('TCM-BA',  'Tribunal de Contas dos Municípios do Estado da Bahia', 'municipal_estadual'),
  ('TCM-GO',  'Tribunal de Contas dos Municípios do Estado de Goiás', 'municipal_estadual'),
  ('TCM-PA',  'Tribunal de Contas dos Municípios do Estado do Pará', 'municipal_estadual'),
  ('TCM-SP',  'Tribunal de Contas do Município de São Paulo', 'municipal'),
  ('TCM-RJ',  'Tribunal de Contas do Município do Rio de Janeiro', 'municipal')
ON CONFLICT (sigla) DO NOTHING;

-- 3) Status de monitoramento: adicionar 'nao_iniciado' ao enum + tabela básica
ALTER TYPE public.status_monitoramento ADD VALUE IF NOT EXISTS 'nao_iniciado' BEFORE 'em_monitoramento';

CREATE TABLE IF NOT EXISTS public.status_monitoramento_options (
  codigo text PRIMARY KEY,
  descricao text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  cor text NOT NULL DEFAULT '#64748b',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.status_monitoramento_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth view smo" ON public.status_monitoramento_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin upd smo" ON public.status_monitoramento_options FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
-- Sem INSERT/DELETE para preservar integridade com o enum.

INSERT INTO public.status_monitoramento_options (codigo, descricao, ordem, cor) VALUES
  ('nao_iniciado',     'Não iniciado',      10, '#94a3b8'),
  ('em_monitoramento', 'Em monitoramento',  20, '#3b82f6'),
  ('cumprida',         'Cumprida',          30, '#16a34a'),
  ('descumprida',      'Descumprida',       40, '#dc2626'),
  ('vencida',          'Vencida',           50, '#f59e0b'),
  ('cancelada',        'Cancelada',         60, '#6b7280')
ON CONFLICT (codigo) DO NOTHING;
