ALTER TABLE public.deliberacoes ALTER COLUMN status_monitoramento DROP DEFAULT;
ALTER TABLE public.deliberacoes ALTER COLUMN status_monitoramento TYPE text USING status_monitoramento::text;
ALTER TABLE public.deliberacoes ALTER COLUMN status_monitoramento SET DEFAULT 'nao_iniciado';