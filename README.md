# Task Manager

Aplicativo de gerenciamento de tarefas com projetos, drag-and-drop, datas de vencimento, tarefas recorrentes, busca global e tema dark/light.

**Produção:** https://lista-de-tarefas-rho-smoky.vercel.app
**Desenvolvido por:** [Everaldo Alexandre](https://everaldoalexandre.site)

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS v4** + componentes shadcn/ui + next-themes (dark/light)
- **Prisma** + PostgreSQL
- **better-auth** (email/senha, sessões, troca de senha)
- **Zod** (validação das APIs) · **Vitest** (testes) · **GitHub Actions** (CI)

## Funcionalidades

- Projetos com contador de pendentes e barra de progresso
- Tarefas com data, recorrência (diária/semanal/mensal) e badges de atraso/hoje
- Listas inteligentes "Today" e "Next 7 days"
- Busca global com `Ctrl+K`
- Reordenar arrastando (@hello-pangea/dnd) com persistência transacional
- Desfazer exclusão pelo toast
- Exportar dados em JSON/CSV
- PWA básico (manifest + ícone)
- Rate limiting em memória nas rotas de escrita

## Setup local

```bash
npm install                # roda prisma generate via postinstall
cp .env.example .env       # configure as variáveis abaixo
npx prisma migrate deploy
npm run dev
```

### Variáveis de ambiente

```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
# opcionais
TRUSTED_ORIGINS=https://seu-dominio.com
BETTER_AUTH_URL=https://seu-dominio.com
GOOGLE_CLIENT_ID=...        # login social Google
GOOGLE_CLIENT_SECRET=...
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | ESLint |
| `npm test` | testes unitários (Vitest) |

## Deploy

O CI roda lint, typecheck, testes e build a cada push. Para publicar no Vercel, conecte o repositório em *Settings → Git* ou rode `npx vercel --prod`.
