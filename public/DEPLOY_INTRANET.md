# Tutorial de Implantação Local (Intranet) — Sistema de Controle de Decisões

Guia destinado ao **administrador de TI** que deseja rodar o sistema **inteiramente em servidores próprios** (datacenter / intranet), **sem qualquer dependência da plataforma Lovable** em produção, mantendo 100% das funcionalidades (autenticação, banco de dados, storage de anexos, RLS, server functions, dashboard, monitoramento, etc.).

---

## 1. Visão geral da arquitetura

O sistema possui dois grandes blocos:

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND + SERVER FUNCTIONS (TanStack Start + Vite)    │
│  - SPA React 19                                          │
│  - Server Functions (createServerFn) executadas em Node │
│  - SSR opcional                                          │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│  BACKEND (Supabase self-hosted via Docker)              │
│  - PostgreSQL 15 + RLS                                   │
│  - GoTrue (Auth)                                         │
│  - PostgREST (API REST)                                  │
│  - Storage API (anexos, logos)                           │
│  - Realtime                                              │
│  - Studio (painel admin)                                 │
└─────────────────────────────────────────────────────────┘
```

> Tudo é **open-source**. Não há nenhum serviço fechado obrigatório.

---

## 2. Pré-requisitos do servidor

| Item | Versão mínima | Observação |
|------|--------------|-----------|
| Sistema operacional | Linux (Ubuntu 22.04 LTS recomendado) | Funciona em RHEL/Rocky/Debian |
| Docker Engine | 24+ | `apt install docker.io docker-compose-plugin` |
| Node.js | 20 LTS | Para build do frontend |
| Bun (opcional) | 1.1+ | Acelera instalação de deps |
| Git | qualquer | Clonar o repositório |
| RAM | 4 GB (mínimo), 8 GB recomendado | |
| Disco | 20 GB livres | Inclui banco e anexos |
| Domínio interno | ex.: `decisoes.intra.tce.local` | Resolvido pelo DNS interno |
| Certificado TLS | Wildcard ou específico | Pode usar CA interna |

---

## 3. Subir o backend Supabase auto-hospedado

### 3.1. Clonar o repositório oficial do Supabase

```bash
git clone --depth 1 https://github.com/supabase/supabase /opt/supabase
cd /opt/supabase/docker
cp .env.example .env
```

### 3.2. Editar `/opt/supabase/docker/.env`

Gere chaves seguras (substitua os valores de exemplo):

```bash
# Senhas / segredos — TROCAR TODOS
POSTGRES_PASSWORD=<senha-forte-postgres>
JWT_SECRET=<string-aleatória-de-no-mínimo-32-chars>
ANON_KEY=<gerar-no-passo-3.3>
SERVICE_ROLE_KEY=<gerar-no-passo-3.3>
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<senha-forte-do-studio>

# URLs públicas — usar o seu domínio interno
SITE_URL=https://decisoes.intra.tce.local
API_EXTERNAL_URL=https://api.decisoes.intra.tce.local
SUPABASE_PUBLIC_URL=https://api.decisoes.intra.tce.local

# Desabilitar SMTP externo (ou apontar para o relay SMTP interno)
SMTP_ADMIN_EMAIL=naoresponder@tce.local
SMTP_HOST=smtp.intra.tce.local
SMTP_PORT=25
SMTP_USER=
SMTP_PASS=
SMTP_SENDER_NAME="Sistema de Decisões"

# Auth
DISABLE_SIGNUP=false           # mantém aberto para cadastro c/ aprovação
ENABLE_EMAIL_AUTOCONFIRM=true  # opcional p/ ambiente sem SMTP
```

### 3.3. Gerar `ANON_KEY` e `SERVICE_ROLE_KEY`

Use o gerador oficial: <https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys> (pode ser feito offline com qualquer biblioteca JWT). Os tokens devem ser assinados com o mesmo `JWT_SECRET` definido acima.

### 3.4. Subir os containers

```bash
cd /opt/supabase/docker
docker compose pull
docker compose up -d
docker compose ps   # confirmar todos "healthy"
```

Acesse o **Studio** em `https://api.decisoes.intra.tce.local` (porta 8000 por padrão; coloque atrás de Nginx com TLS).

### 3.5. Aplicar as migrations do projeto

Copie o diretório `supabase/migrations/` deste projeto para o servidor e execute, em ordem alfabética:

```bash
cd /caminho/do/projeto
for f in supabase/migrations/*.sql; do
  echo ">>> Aplicando $f"
  PGPASSWORD=<POSTGRES_PASSWORD> psql \
    -h localhost -p 5432 -U postgres -d postgres -f "$f"
done
```

> Alternativa: use o **Supabase CLI** (`supabase db push`) apontando para a instância local.

### 3.6. Criar buckets de storage

No Studio → **Storage**, crie:

| Nome | Público? | Uso |
|------|---------|-----|
| `tribunal-logos` | **Sim** | Logos exibidas no login |
| `deliberacao-anexos` | Não | PDFs e anexos das deliberações |

As políticas de leitura/escrita já vêm aplicadas pelas migrations.

---

## 4. Build e deploy do frontend

### 4.1. Clonar o projeto

```bash
git clone <url-do-repositório-exportado> /opt/controle-decisoes
cd /opt/controle-decisoes
```

> Para exportar o código do Lovable: **GitHub → Connect** dentro do projeto, ou faça download direto do código.

### 4.2. Configurar variáveis de ambiente

Crie `/opt/controle-decisoes/.env` (NÃO commitar):

```bash
# Públicas (vão para o bundle do navegador)
VITE_SUPABASE_URL=https://api.decisoes.intra.tce.local
VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY-gerada-no-3.3>
VITE_SUPABASE_PROJECT_ID=local

# Privadas (apenas servidor — server functions)
SUPABASE_URL=https://api.decisoes.intra.tce.local
SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

### 4.3. Instalar dependências e gerar build

```bash
# com bun (recomendado)
curl -fsSL https://bun.sh/install | bash
bun install
bun run build

# ou com npm
npm install
npm run build
```

O build gera a pasta `.output/` (artefato do Nitro) com:

- `.output/public/` → estáticos do frontend
- `.output/server/` → handler Node das server functions

### 4.4. Servir em produção (Node + PM2)

```bash
npm install -g pm2
cd /opt/controle-decisoes
PORT=3000 pm2 start .output/server/index.mjs --name controle-decisoes
pm2 save
pm2 startup   # gera o systemd unit para iniciar no boot
```

### 4.5. Nginx como reverse proxy (TLS)

`/etc/nginx/sites-available/controle-decisoes`:

```nginx
server {
  listen 443 ssl http2;
  server_name decisoes.intra.tce.local;

  ssl_certificate     /etc/ssl/intra/decisoes.crt;
  ssl_certificate_key /etc/ssl/intra/decisoes.key;

  client_max_body_size 50m;   # uploads de anexos

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}

server {
  listen 443 ssl http2;
  server_name api.decisoes.intra.tce.local;
  ssl_certificate     /etc/ssl/intra/decisoes.crt;
  ssl_certificate_key /etc/ssl/intra/decisoes.key;

  location / {
    proxy_pass http://127.0.0.1:8000;   # Kong do Supabase
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

```bash
ln -s /etc/nginx/sites-available/controle-decisoes /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 5. Primeiro uso e bootstrap administrativo

1. Acesse `https://decisoes.intra.tce.local`
2. Clique em **Cadastrar** e crie a primeira conta. **O primeiro usuário é automaticamente promovido a `admin` e aprovado** (regra do trigger `handle_new_user`).
3. Faça login como administrador e:
   - Vá em **Administração → Cadastros Básicos** e revise as listas (Tribunais já vem pré-populado com 33 cortes; ajuste se necessário).
   - Vá em **Administração → Usuários** para aprovar / atribuir papéis dos demais usuários conforme forem se cadastrando.

### Papéis disponíveis (`app_role`)

| Papel | Permissão |
|-------|-----------|
| `admin` | Tudo (CRUD total, cadastros básicos, usuários) |
| `secretaria` | Cria/edita registros e deliberações |
| `monitoramento` | Atualiza monitoramento da sua unidade técnica |
| `consulta` | Apenas leitura (após aprovado) |

---

## 6. Backup e manutenção

### 6.1. Backup do banco

```bash
# Diariamente via cron
docker exec supabase-db pg_dump -U postgres postgres \
  | gzip > /backup/postgres-$(date +%F).sql.gz
```

### 6.2. Backup dos anexos (storage)

```bash
rsync -a /opt/supabase/docker/volumes/storage/ /backup/storage/
```

### 6.3. Atualizações

- **Banco / Supabase**: `cd /opt/supabase/docker && docker compose pull && docker compose up -d`
- **Aplicação**: `git pull && bun install && bun run build && pm2 restart controle-decisoes`
- **Migrations novas**: aplicar com `psql` (passo 3.5) **antes** de reiniciar o app.

---

## 7. Hardening de segurança

- [x] Manter `SUPABASE_SERVICE_ROLE_KEY` **somente** no servidor (nunca em `VITE_*`).
- [x] Restringir o IP do Studio (porta 8000) ao range da intranet via firewall.
- [x] HTTPS obrigatório com certificado emitido pela CA interna.
- [x] Habilitar **HIBP** (proteção contra senhas vazadas) — já configurado.
- [x] RLS está habilitada em todas as tabelas; não desabilite.
- [x] Auditar `audit_log` periodicamente.
- [x] SMTP interno para reset de senha (opcional, mas recomendado).

---

## 8. Solução de problemas

| Sintoma | Causa provável | Correção |
|---------|---------------|----------|
| Login retorna `Invalid API key` | `ANON_KEY` no `.env` do app não bate com a do Supabase | Regenerar e reiniciar containers + app |
| 401 em `createServerFn` | Bearer token não anexado | Verificar `attachSupabaseAuth` em `src/start.ts` |
| Anexos não carregam | Bucket `deliberacao-anexos` ausente | Recriar no Studio |
| Lista de tribunais vazia | Migrations não aplicadas | Reaplicar (passo 3.5) |
| `window is not defined` no boot | SSR tentou usar API de browser | Apenas reportar — não afeta uso |

---

## 9. Suporte

Documentação oficial usada como base:

- Supabase self-hosting: <https://supabase.com/docs/guides/self-hosting/docker>
- TanStack Start: <https://tanstack.com/start>
- PostgreSQL: <https://www.postgresql.org/docs/15/>

Em caso de dúvida sobre o código-fonte, consulte os comentários nas migrations em `supabase/migrations/` e os arquivos `src/integrations/supabase/*`.

---

**Versão deste guia:** 1.0 — Maio/2026
