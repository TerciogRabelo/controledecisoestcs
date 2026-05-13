
# Sistema de Registros de Decisão — TCE-PI

Sistema institucional para a Secretaria das Sessões gerenciar decisões, deliberações e monitoramento. Esta primeira entrega monta a **fundação completa**: banco modelado, autenticação interna (mock) com 4 perfis, CRUD principal funcional com subgrid de deliberações, cadastros básicos e dashboard inicial. Os módulos de Auditoria, Relatórios avançados, Inconsistências automáticas e Alertas ficam para iterações seguintes (escopo já preparado no schema).

## Identidade visual (TCE-PI)

Baseada no Manual da Marca do TCE-PI:
- **Azul institucional** como primária, **dourado/ocre** como secundária de destaque, neutros (branco, cinza claro, cinza escuro).
- Tipografia sans-serif institucional (Inter como aproximação web do padrão do manual).
- Layout limpo estilo **Microsoft Lists / SharePoint moderno**: grids densas, badges coloridos por status, ícones Lucide, header fino, sidebar de navegação.
- Dark mode ativado.
- Logotipo: placeholder até você anexar o SVG oficial; deixo o ponto de troca documentado.

## Stack

- React 19 + TypeScript + TanStack Start (já instalado)
- Tailwind v4 + shadcn/ui (tokens em `src/styles.css`)
- Lovable Cloud (Supabase: Postgres + Auth + Storage)
- Recharts para gráficos
- React Hook Form + Zod para formulários
- TanStack Query para cache de dados

## Autenticação (mock interno por enquanto)

- Email + senha via Lovable Cloud Auth (rápido, sem dependência externa).
- Tabela `profiles` (1:1 com `auth.users`) + `user_roles` separada com enum `app_role` (`admin | secretaria | monitoramento | consulta`).
- Função `has_role()` SECURITY DEFINER + RLS em todas as tabelas.
- Primeiro usuário cadastrado vira `admin` automaticamente; demais entram como `consulta` e o admin promove via tela de Gestão de Usuários.
- Hooks de UI já abstraem o provedor — quando você quiser ligar o Azure AD, troca-se apenas o provedor no painel do Cloud sem reescrever telas.

## Modelagem do banco

Tabelas exatamente conforme o briefing (com tipos e FKs):

```text
unidades_gestoras (id, nome_unidade, sigla, esfera, municipio, cnpj, status, created_at)
orgaos_julgadores (id, descricao, ativo, created_at)
tipos_decisao    (id, descricao, ativo)
tipos_julgamento (id, descricao, ativo)
tipos_deliberacao(id, descricao, gera_prazo, permite_valor,
                  permite_unidade_medida, cor, icone, ativo)

registros_decisao (
  id, numero_processo (mask 000000/0000), unidade_gestora_id FK,
  orgao_julgador_id FK, tipo_decisao_id FK, numero_decisao,
  data_decisao, tipo_julgamento_id FK, gestor_responsavel,
  cpf_cnpj, data_transito_julgado, quantidade_deliberacoes (gerada),
  houve_deliberacao (gerada), status_registro, observacoes,
  criado_por, criado_em, atualizado_por, atualizado_em
)

processos_relacionados (id, registro_decisao_id FK CASCADE,
  numero_processo_relacionado, observacao)

deliberacoes (
  id, registro_decisao_id FK CASCADE, tipo_deliberacao_id FK,
  descricao, prazo_dias, valor numeric, unidade_medida,
  observacao, deliberacao_solidaria bool,
  status_monitoramento ('em_monitoramento'|'cumprido'|'nao_cumprido'|
                        'parcialmente_cumprido'|'vencido'),
  data_verificacao, resultado_monitoramento, resposta_gestor,
  anexos jsonb, criado_por, criado_em, atualizado_por, atualizado_em
)

profiles    (id PK = auth.users.id, nome, email, avatar_url)
user_roles  (id, user_id, role app_role, unique(user_id, role))
audit_log   (id, tabela, registro_id, acao, valor_anterior jsonb,
             valor_novo jsonb, usuario_id, criado_em)  -- estrutura pronta
```

- Triggers: `updated_at`, contagem automática de `quantidade_deliberacoes`/`houve_deliberacao` no registro pai, marcação de `vencido` quando prazo expira.
- Bucket de Storage `deliberacao-anexos` com RLS por perfil.
- Seeds dos cadastros básicos (órgãos julgadores, tipos de decisão/julgamento/deliberação) já populados.

## Módulos entregues nesta v1

1. **Auth + Layout institucional**
   - Tela de login/cadastro, sidebar com navegação, header com tema claro/escuro, breadcrumbs.
2. **Dashboard Geral**
   - 8 cards (decisões, deliberações totais/pendentes/cumpridas, multas qtd e valor, processos, gestores).
   - Gráficos Recharts: barras (deliberações por tipo), temporal (decisões/mês), pizza (status), ranking (top unidades gestoras).
   - Filtros globais (período, órgão, unidade, status).
3. **Registros de Decisão (tela principal)**
   - Grid estilo Microsoft Lists: paginação, ordenação, agrupamento por coluna, filtros avançados, busca global, colunas configuráveis, exportação Excel/CSV.
   - Formulário em 4 blocos (Dados Gerais, Julgamento, Gestor, Deliberações) com máscaras de processo e CPF/CNPJ + validação real.
   - Subgrid de **Deliberações** dentro do detalhe (master-detail) com nova/editar/excluir/duplicar/monitorar, herança automática dos campos do registro pai, upload múltiplo de anexos drag-and-drop.
4. **Cadastros Básicos**
   - CRUD para Unidades Gestoras, Órgãos Julgadores, Tipos de Decisão, Tipos de Julgamento, Tipos de Deliberação.
5. **Gestão de Usuários (Admin)**
   - Listar usuários, atribuir/remover perfis.
6. **Exportação básica** (Excel/CSV) na grid principal e PDF simples por registro.

## Módulos planejados para próximas iterações

Ficam **fora desta entrega** mas com schema/hooks já preparados:
- Painel de Inconsistências automáticas
- Alertas/notificações de prazo
- Auditoria com timeline visual completa
- Relatórios avançados (PDF formatado por gestor/unidade/multas)
- Heatmap, indicadores semafóricos avançados
- Workflow de monitoramento, comentários internos, histórico de versões, autosave, favoritos
- Inteligência para sugerir unidade gestora pelo número do processo
- Troca do provedor de auth para Azure AD

Sugiro fazer essas em blocos pequenos depois que a fundação estiver validada.

## Ordem de execução

1. Habilitar Lovable Cloud
2. Migration: enums, tabelas, triggers, RLS, função `has_role`, seeds
3. Storage bucket + policies
4. Design tokens TCE-PI em `src/styles.css` + dark mode
5. Layout (sidebar/header) + rotas protegidas por perfil
6. Auth (login/cadastro/perfil)
7. Cadastros básicos
8. Tela de Registros de Decisão (lista + formulário + subgrid de deliberações)
9. Dashboard
10. Gestão de Usuários
11. Exportações Excel/CSV/PDF básico

Pronto para implementar quando você aprovar.
