ALTER TABLE public.deliberacoes
ADD COLUMN IF NOT EXISTS passivel_monitoramento boolean NOT NULL DEFAULT true;