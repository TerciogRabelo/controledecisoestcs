CREATE TABLE public.processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aprovados podem ver processos" ON public.processos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/secretaria gerenciam processos" ON public.processos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretaria'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretaria'));
