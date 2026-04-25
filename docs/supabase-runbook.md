# Runbook Supabase (Setup + Teste)

## 1) Configurar ambiente local

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Preencha no `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ocfgzvifwqdnlkimfwrg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

## 2) Executar SQL no Supabase

No painel Supabase:

- SQL Editor -> New query
- Execute nesta ordem:
  1. `packages/database/sql/001_init.sql`
  2. `packages/database/sql/003_auth_per_user_rls.sql` (quando o banco ja existe)
  3. `packages/database/sql/004_user_settings.sql`
  4. `packages/database/sql/005_quote_status.sql`
  5. `packages/database/sql/006_orders.sql`
  6. `packages/database/sql/007_catalog_items.sql`
  7. `packages/database/sql/002_seed_sample.sql` (opcional)

## 3) Configurar Auth no Supabase

No painel Supabase:

- Authentication -> URL Configuration
  - Site URL: `http://localhost:3000`
  - Redirect URLs: `http://localhost:3000/auth/confirm`

- Authentication -> Email Templates -> Confirm signup
  - URL de confirmacao:

```txt
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## 4) Rodar projeto local

```bash
npm install
npm run dev
```

Abrir:

- `http://localhost:3000/orcamentos`
  - se nao estiver logado, voce sera redirecionado para `/auth/login`
  - se nao tiver onboarding concluido, voce sera redirecionado para `/onboarding`

## 5) Testes manuais de API

As rotas de negocio exigem sessao autenticada. Para testar via curl, use os cookies de uma sessao valida.

Listar orcamentos:

```bash
curl http://localhost:3000/api/quotes
```

Criar orcamento (exemplo):

```bash
curl -X POST http://localhost:3000/api/quotes \
  -H "Content-Type: application/json" \
  -d "{\"quoteNumber\":\"ORC-2026-0099\",\"issueDate\":\"2026-04-20\",\"company\":{\"name\":\"R.A RONALDO LACERDA M.E\",\"document\":\"06.020.782/0001-07\",\"stateRegistration\":\"002091153.00-53\",\"phone\":\"(34) 99151-1712\",\"address\":\"RUA CARLOS LUIZ BRAZ, SAO DIMAS\",\"zipCode\":\"38950-000\",\"city\":\"IBIA\",\"state\":\"MG\",\"logoDataUrl\":\"\"},\"client\":{\"name\":\"CONSTRUTORA ATERPA S/A\",\"document\":\"17.162.983/0048-29\",\"stateRegistration\":\"000000000.00-00\",\"phone\":\"(31) 2125-5000\",\"address\":\"R JUVELINO ALVES BITTENCOURT\",\"zipCode\":\"38183-394\",\"city\":\"ARAXA\",\"state\":\"MG\"},\"items\":[{\"id\":\"1\",\"code\":\"COD-0001\",\"name\":\"Brita 1\",\"unitPrice\":120,\"quantity\":10,\"unit\":\"TON\"}],\"adjustments\":{\"discountType\":\"fixed\",\"discountValue\":0,\"freight\":0,\"taxRate\":0},\"notes\":\"Teste\"}"
```

Gerar PDF (troque `<ID>`):

```bash
curl -L http://localhost:3000/api/quotes/<ID>/pdf --output orcamento.pdf
```

## 6) Checklist final

- `npm run lint`
- `npm run build`
- Criar/editar orcamento via UI
- Gerar PDF via UI
