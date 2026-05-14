ALTER TABLE public.deliberacoes ALTER COLUMN status_monitoramento SET DEFAULT 'nao_iniciado'::status_monitoramento;

INSERT INTO public.status_monitoramento_options (codigo, descricao, ordem, cor, ativo)
VALUES ('nao_iniciado', 'Não iniciado', 0, '#94a3b8', true)
ON CONFLICT (codigo) DO NOTHING;