## Plano de execução

### 1. Prazo facultativo em Tipos de Deliberação
- Adicionar coluna `prazo_facultativo boolean default false` em `tipos_deliberacao`.
- No CRUD (`cadastros.tsx`): novo switch "Prazo facultativo" (só habilitado quando "Gera prazo" estiver ativo).
- No diálogo de Deliberação (`registros.$id.tsx`): se o tipo tem `gera_prazo` e `prazo_facultativo`, os campos "Data de Início do Prazo" e "Prazo (dias)" deixam de ser obrigatórios na validação (badge "opcional").

### 2. Multi-tribunal (33 TCs) + logo
- Nova tabela `tribunais` (sigla, nome, esfera, logo_url, ativo). Seed com os 33 tribunais informados (TCU, 26 TCEs, TCDF, 3 TCMs estaduais, TCM-SP, TCM-RJ).
- Adicionar `tribunal_id uuid` em `profiles`. Adicionar role conceitual "master" como flag `is_master boolean` em `profiles` (usuário master vê/edita qualquer tribunal). Apenas master pode alterar `is_master` de outros.
- Bucket público `tribunal-logos` para upload do brasão. Política: leitura pública; escrita somente admin.
- Página **Cadastros Básicos** ganha aba "Tribunais" (master vê todos; admin vê e edita só o seu — pode trocar nome/sigla/logo).
- **Sidebar**: substituir o ícone fixo de escudo pela `logo_url` do tribunal do usuário logado (fallback para o ShieldCheck atual). Mostrar a sigla do tribunal abaixo de "TCE-PI" — ou substituir.
- **Cadastro de usuário** (página `usuarios.tsx`): nova coluna "Tribunal" com Select dos 33 tribunais. Master pode escolher qualquer; admin tem o seu fixado. Novos usuários (handle_new_user) começam sem tribunal — admin atribui na aprovação.
- Observação importante: este passo NÃO altera as RLS atuais (a aplicação continuará exibindo dados de todos os tribunais para os usuários existentes). A segmentação real de dados por tribunal é uma mudança maior e fica para um próximo ciclo — por ora cumprimos o cadastro/atribuição/exibição visual.

### 3. Reorganização do diálogo de Deliberação
- Mover **Unidade Técnica Responsável** para o frame "DELIBERAÇÃO" (no topo, ao lado de Tipo).
- Mover **Status** (atual `status_monitoramento`) para o frame "MONITORAMENTO".
- Default de status para nova deliberação: `nao_iniciado`.

### 4. Status de Monitoramento como tabela básica (item 6)
- Adicionar valor `nao_iniciado` ao enum `status_monitoramento`.
- Mudar default da coluna `deliberacoes.status_monitoramento` para `'nao_iniciado'`.
- Criar tabela `status_monitoramento_options (codigo text PK, descricao text, ordem int, cor text, ativo bool)` com seed: nao_iniciado (padrão, azul claro), em_monitoramento, cumprida, descumprida, vencida, cancelada.
- Nova aba em Cadastros Básicos: "Status de Monitoramento" (CRUD simples — só descrição/ordem/cor/ativo são editáveis; o `codigo` é fixo/read-only para preservar integridade com o enum).
- Diálogo e tabela de deliberações passam a ler labels/cores dessa tabela.

### 5. Velocímetro no Dashboard
- Adicionar card "Cobertura de Monitoramento" com gauge (semicírculo recharts/PieChart) mostrando % de deliberações com monitoramento iniciado/finalizado vs sem monitoramento.
- Buckets:
  - **Sem monitoramento**: status `nao_iniciado`.
  - **Em andamento**: status `em_monitoramento`.
  - **Finalizado**: status `cumprida`, `descumprida`, `vencida`, `cancelada`.
- Mostrar números absolutos e percentuais de cada bucket abaixo do gauge.

## Detalhes técnicos

- Migração única SQL contendo: alter `tipos_deliberacao`, alter enum, alter default, criar `tribunais`, criar `status_monitoramento_options`, criar bucket `tribunal-logos` com policies, alterar `profiles`, seed dos 33 tribunais, seed das opções de status.
- `auth-context.tsx`: carregar `tribunal_id`, `is_master` e (se quiser) o objeto tribunal com logo.
- `app-sidebar.tsx`: renderizar `<img>` do logo do tribunal quando disponível.

Após aprovação, executo a migração e em seguida todas as edições de UI no mesmo turno.