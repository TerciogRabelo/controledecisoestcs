
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'secretaria', 'monitoramento', 'consulta');
CREATE TYPE public.status_monitoramento AS ENUM ('em_monitoramento','cumprido','nao_cumprido','parcialmente_cumprido','vencido');
CREATE TYPE public.status_registro AS ENUM ('rascunho','ativo','arquivado');
CREATE TYPE public.esfera_unidade AS ENUM ('estadual','municipal','federal','outra');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

-- handle_new_user trigger: create profile + assign role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_first_user BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email
  );

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first_user;

  IF _is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'consulta');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- updated_at helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- CADASTROS BÁSICOS
-- =========================================================
CREATE TABLE public.unidades_gestoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_unidade TEXT NOT NULL,
  sigla TEXT,
  esfera public.esfera_unidade NOT NULL DEFAULT 'municipal',
  municipio TEXT,
  cnpj TEXT,
  status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ug_updated BEFORE UPDATE ON public.unidades_gestoras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.orgaos_julgadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tipos_decisao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE public.tipos_julgamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE public.tipos_deliberacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL UNIQUE,
  gera_prazo BOOLEAN NOT NULL DEFAULT FALSE,
  permite_valor BOOLEAN NOT NULL DEFAULT FALSE,
  permite_unidade_medida BOOLEAN NOT NULL DEFAULT FALSE,
  cor TEXT NOT NULL DEFAULT '#1e40af',
  icone TEXT NOT NULL DEFAULT 'gavel',
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- =========================================================
-- REGISTROS DE DECISÃO
-- =========================================================
CREATE TABLE public.registros_decisao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_processo TEXT NOT NULL,
  unidade_gestora_id UUID REFERENCES public.unidades_gestoras(id) ON DELETE SET NULL,
  orgao_julgador_id UUID REFERENCES public.orgaos_julgadores(id) ON DELETE SET NULL,
  tipo_decisao_id UUID REFERENCES public.tipos_decisao(id) ON DELETE SET NULL,
  numero_decisao TEXT,
  data_decisao DATE,
  tipo_julgamento_id UUID REFERENCES public.tipos_julgamento(id) ON DELETE SET NULL,
  gestor_responsavel TEXT,
  cpf_cnpj TEXT,
  data_transito_julgado DATE,
  quantidade_deliberacoes INTEGER NOT NULL DEFAULT 0,
  houve_deliberacao BOOLEAN NOT NULL DEFAULT FALSE,
  status_registro public.status_registro NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por UUID REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rd_processo ON public.registros_decisao(numero_processo);
CREATE INDEX idx_rd_cpfcnpj ON public.registros_decisao(cpf_cnpj);
CREATE INDEX idx_rd_unidade ON public.registros_decisao(unidade_gestora_id);

CREATE OR REPLACE FUNCTION public.set_registros_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_rd_updated BEFORE UPDATE ON public.registros_decisao FOR EACH ROW EXECUTE FUNCTION public.set_registros_atualizado_em();

-- processos relacionados
CREATE TABLE public.processos_relacionados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_decisao_id UUID NOT NULL REFERENCES public.registros_decisao(id) ON DELETE CASCADE,
  numero_processo_relacionado TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pr_registro ON public.processos_relacionados(registro_decisao_id);

-- deliberacoes
CREATE TABLE public.deliberacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_decisao_id UUID NOT NULL REFERENCES public.registros_decisao(id) ON DELETE CASCADE,
  tipo_deliberacao_id UUID REFERENCES public.tipos_deliberacao(id) ON DELETE SET NULL,
  descricao TEXT,
  prazo_dias INTEGER,
  valor NUMERIC(18,2),
  unidade_medida TEXT,
  observacao TEXT,
  deliberacao_solidaria BOOLEAN NOT NULL DEFAULT FALSE,
  status_monitoramento public.status_monitoramento NOT NULL DEFAULT 'em_monitoramento',
  data_verificacao DATE,
  resultado_monitoramento TEXT,
  resposta_gestor TEXT,
  anexos JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por UUID REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_del_registro ON public.deliberacoes(registro_decisao_id);
CREATE INDEX idx_del_status ON public.deliberacoes(status_monitoramento);

CREATE OR REPLACE FUNCTION public.set_deliberacoes_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_del_updated BEFORE UPDATE ON public.deliberacoes FOR EACH ROW EXECUTE FUNCTION public.set_deliberacoes_atualizado_em();

-- recompute counts on registros_decisao
CREATE OR REPLACE FUNCTION public.recompute_registro_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  _registro_id UUID;
  _count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _registro_id := OLD.registro_decisao_id;
  ELSE
    _registro_id := NEW.registro_decisao_id;
  END IF;

  SELECT COUNT(*) INTO _count FROM public.deliberacoes WHERE registro_decisao_id = _registro_id;

  UPDATE public.registros_decisao
  SET quantidade_deliberacoes = _count,
      houve_deliberacao = (_count > 0)
  WHERE id = _registro_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_del_count_ins AFTER INSERT ON public.deliberacoes FOR EACH ROW EXECUTE FUNCTION public.recompute_registro_counts();
CREATE TRIGGER trg_del_count_del AFTER DELETE ON public.deliberacoes FOR EACH ROW EXECUTE FUNCTION public.recompute_registro_counts();

-- =========================================================
-- AUDIT LOG
-- =========================================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela TEXT NOT NULL,
  registro_id UUID,
  acao TEXT NOT NULL,
  valor_anterior JSONB,
  valor_novo JSONB,
  usuario_id UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tabela ON public.audit_log(tabela, registro_id);

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_gestoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgaos_julgadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_decisao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_julgamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_deliberacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_decisao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos_relacionados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliberacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "auth view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "self update profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "admin update profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "auth view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage roles ins" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage roles upd" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage roles del" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- helper macro: cadastros básicos -> view all auth, manage admin/secretaria
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['unidades_gestoras','orgaos_julgadores','tipos_decisao','tipos_julgamento','tipos_deliberacao'] LOOP
    EXECUTE format('CREATE POLICY "auth view %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('CREATE POLICY "edit ins %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY[''admin''::public.app_role,''secretaria''::public.app_role]));', t);
    EXECUTE format('CREATE POLICY "edit upd %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY[''admin''::public.app_role,''secretaria''::public.app_role]));', t);
    EXECUTE format('CREATE POLICY "admin del %1$s" ON public.%1$s FOR DELETE TO authenticated USING (public.has_role(auth.uid(),''admin''));', t);
  END LOOP;
END $$;

-- registros_decisao
CREATE POLICY "auth view rd" ON public.registros_decisao FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit ins rd" ON public.registros_decisao FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role]));
CREATE POLICY "edit upd rd" ON public.registros_decisao FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role]));
CREATE POLICY "admin del rd" ON public.registros_decisao FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- processos_relacionados
CREATE POLICY "auth view pr" ON public.processos_relacionados FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit ins pr" ON public.processos_relacionados FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role]));
CREATE POLICY "edit upd pr" ON public.processos_relacionados FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role]));
CREATE POLICY "edit del pr" ON public.processos_relacionados FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role]));

-- deliberacoes (also monitoramento can update)
CREATE POLICY "auth view del" ON public.deliberacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit ins del" ON public.deliberacoes FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role]));
CREATE POLICY "edit upd del" ON public.deliberacoes FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role,'monitoramento'::public.app_role]));
CREATE POLICY "admin del del" ON public.deliberacoes FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role]));

-- audit_log: only admins read
CREATE POLICY "admin view audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth ins audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- =========================================================
-- STORAGE BUCKET
-- =========================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('deliberacao-anexos','deliberacao-anexos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth view anexos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'deliberacao-anexos');

CREATE POLICY "edit upload anexos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'deliberacao-anexos' AND public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role,'monitoramento'::public.app_role]));

CREATE POLICY "edit update anexos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'deliberacao-anexos' AND public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role,'monitoramento'::public.app_role]));

CREATE POLICY "edit delete anexos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'deliberacao-anexos' AND public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'secretaria'::public.app_role]));

-- =========================================================
-- SEEDS
-- =========================================================
INSERT INTO public.orgaos_julgadores (descricao) VALUES
  ('1ª Câmara'), ('2ª Câmara'), ('Tribunal Pleno');

INSERT INTO public.tipos_decisao (descricao) VALUES
  ('Acórdão'), ('Parecer Prévio'), ('Resolução'), ('Decisão Monocrática');

INSERT INTO public.tipos_julgamento (descricao) VALUES
  ('Regularidade'), ('Procedente'), ('Parcialmente Procedente'), ('Arquivamento'), ('Improcedente');

INSERT INTO public.tipos_deliberacao (descricao, gera_prazo, permite_valor, permite_unidade_medida, cor, icone) VALUES
  ('Multa', TRUE, TRUE, TRUE, '#dc2626', 'badge-dollar-sign'),
  ('Recomendação', TRUE, FALSE, FALSE, '#0891b2', 'lightbulb'),
  ('Ciência', FALSE, FALSE, FALSE, '#64748b', 'info'),
  ('Determinação', TRUE, FALSE, FALSE, '#1e40af', 'gavel'),
  ('Ressarcimento', TRUE, TRUE, TRUE, '#b45309', 'banknote'),
  ('Alerta', TRUE, FALSE, FALSE, '#ca8a04', 'alert-triangle'),
  ('Outros', FALSE, FALSE, FALSE, '#475569', 'more-horizontal');
