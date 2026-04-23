# Orbicom Monorepo

Orbicom - Gestao comercial de ponta a ponta.

Frontend + backend em Next.js com persistencia em PostgreSQL (Supabase), geracao de documentos PDF server-side e estrutura monorepo com workspaces.

## Estrutura

- `src/` - app Next.js (UI + API routes)
- `packages/domain` - tipos de dominio compartilhados
- `packages/database` - client Supabase e schema SQL
- `packages/pdf` - pacote reservado para evolucao de templates PDF

## Requisitos

- Node.js 20+
- Conta gratuita no Supabase

## Configuracao do banco (Supabase)

1. Crie um projeto no Supabase.
2. No SQL Editor, execute o script:
   - `packages/database/sql/001_init.sql`
   - `packages/database/sql/003_auth_per_user_rls.sql` (somente para banco ja existente)
3. Gere as credenciais em Project Settings > API.

## Variaveis de ambiente

Crie o arquivo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SEU_PUBLISHABLE_KEY
```

## Configuracao de Auth (Supabase)

No painel Supabase (Authentication -> URL Configuration):

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/confirm`

No template de email de confirmacao (Authentication -> Email Templates), use:

```txt
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Scripts principais

- `npm run dev` - ambiente local
- `npm run lint` - validacao ESLint
- `npm run build` - build de producao
- `npm run turbo:build` - pipeline monorepo (Turbo)

## API principal

As rotas abaixo exigem usuario autenticado (cookie de sessao Supabase).

- `GET /api/quotes` - lista orcamentos
- `POST /api/quotes` - cria orcamento
- `GET /api/quotes/:id` - detalhe do orcamento
- `PUT /api/quotes/:id` - atualiza orcamento
- `GET /api/quotes/:id/pdf` - gera PDF server-side
- `GET /api/quotes/draft` - cria rascunho inicial
- `GET /api/companies` - lista empresas
- `GET /api/clients` - lista clientes

## Deploy na Vercel

1. Suba o repositorio no GitHub.
2. Importe na Vercel.
3. Configure as variaveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy.

## Runbook completo

Veja o passo a passo de setup e testes em `docs/supabase-runbook.md`.
