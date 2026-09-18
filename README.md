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
- Tarefas com data, recorrência (diária/semanal/mensal), prioridade, tags e descrições multilinha
- Edição completa da tarefa (descrição, data, prioridade, recorrência, tags, projeto, checklist)
- Listas inteligentes "Today" e "Next 7 days" (respeitam o fuso horário local)
- Visões lista, board (kanban) e calendário mensal
- Busca global com `Ctrl+K` (tarefas, projetos e notas)
- Notas com vínculo a tarefas/projetos, fixação e lixeira própria
- Hábitos com streaks, XP, níveis e conquistas + weekly review
- Pomodoro timer com registro de horas por projeto de estudo
- Lixeira com restauração, exclusão definitiva e "esvaziar tudo"
- Reordenar arrastando (@hello-pangea/dnd) com persistência transacional
- Desfazer exclusão pelo toast
- Exportar dados em JSON/CSV
- Login com email/senha ou Google, troca de senha, tema dark/light
- Projeto de boas-vindas criado automaticamente no cadastro
- PWA básico (manifest + ícones)
- Rate limiting + proteção anti-CSRF nas rotas de escrita

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
SEED_EMAIL=...            # seed inicial (`npx prisma db seed`)
SEED_NAME=...
SEED_PASSWORD=...         # 12+ caracteres
GOOGLE_CLIENT_ID=...        # login social Google
GOOGLE_CLIENT_SECRET=...
```

Para o login com Google: crie um cliente OAuth em Google Cloud Console →
APIs e serviços → Credenciais, e cadastre como URI de redirecionamento
autorizado `https://seu-dominio.com/api/auth/callback/google`
(`http://localhost:3000/api/auth/callback/google` no desenvolvimento).

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | ESLint |
| `npm test` | testes unitários (Vitest) |
| `npm run audit` | auditoria de vulnerabilidades (npm audit, sem devDeps) |

## Segurança

- Relatório de auditoria em `docs/security-audit/relatorio-auditoria-seguranca.pdf`
  (regenere com o script `docs/security-audit/gerar_relatorio.js`).
- Dependabot configurado (`.github/dependabot.yml`, semanal) para acompanhar CVEs.
- Verificação de e-mail no cadastro: pendente de provedor SMTP. Quando houver
  (ex: Resend), ligue `requireEmailVerification` no better-auth e configure o
  envio de e-mail de verificação.

## Deploy

O CI roda lint, typecheck, testes e build a cada push. Para publicar no Vercel, conecte o repositório em *Settings → Git* ou rode `npx vercel --prod`.
