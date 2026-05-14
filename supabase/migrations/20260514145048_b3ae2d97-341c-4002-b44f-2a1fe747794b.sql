-- Add 'nao_iniciado' value to status_monitoramento enum
ALTER TYPE status_monitoramento ADD VALUE IF NOT EXISTS 'nao_iniciado' BEFORE 'em_monitoramento';