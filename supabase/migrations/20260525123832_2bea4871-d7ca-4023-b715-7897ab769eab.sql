ALTER TABLE public.registros_decisao
  ADD COLUMN IF NOT EXISTS gestor_institucional boolean NOT NULL DEFAULT false;