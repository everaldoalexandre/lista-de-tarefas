#!/usr/bin/env node
/*
 * Auditoria completa de seguranca - gerador do relatorio PDF.
 *
 * Uso (sem instalar nada globalmente):
 *   1. npm init -y && npm install pdfkit pdf-parse@1.1.1   (diretorio isolado, ex: %TEMP%\audit-pdf)
 *   2. NODE_PATH=<dir-isolado>\node_modules node docs/security-audit/gerar_relatorio.js
 *
 * Saida: docs/security-audit/relatorio-auditoria-seguranca.pdf
 * Verificacao: ... gerar_relatorio.js --verificar
 */
'use strict';

const fs = require('fs');
const path = require('path');

let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch {
  console.error('ERRO: pdfkit nao encontrado.');
  console.error('Rode: npm init -y && npm install pdfkit pdf-parse@1.1.1  (em diretorio isolado)');
  process.exit(1);
}

const OUT_DIR = __dirname;
const OUT_PDF = path.join(OUT_DIR, 'relatorio-auditoria-seguranca.pdf');

const COLORS = {
  critica: '#B91C1C',
  alta: '#EA580C',
  media: '#D97706',
  baixa: '#2563EB',
  info: '#6B7280',
  forte: '#059669',
  ink: '#111827',
  gray: '#6B7280',
};

const PAGE = { w: 595.28, h: 841.89 };
const M = { left: 56.7, right: 56.7, top: 92, bottom: 62 };
const CONTENT_W = PAGE.w - M.left - M.right;
const LIMIT_Y = PAGE.h - M.bottom;

/* ------------------------------- dados ------------------------------- */

const SEV_META = {
  critica: { label: 'CRITICA', color: '#B91C1C' },
  alta: { label: 'ALTA', color: '#EA580C' },
  media: { label: 'MEDIA', color: '#D97706' },
  baixa: { label: 'BAIXA', color: '#2563EB' },
  info: { label: 'INFO', color: '#6B7280' },
};

const FINDINGS = [
  { id: 'SEC-001', sev: 'info', cat: 'Conta (ciclo de vida)',
    title: 'Ciclo de vida da conta incompleto: sem recuperacao de senha, exclusao de conta ou 2FA',
    file: 'src/lib/auth.ts:101-104 (+ ausencia verificada em src/)',
    route: 'N/A (fluxo inexistente)',
    desc: 'Nao ha recuperacao de senha self-service, exclusao de conta nem 2FA. Grep por forget-password/resetPassword/deleteUser/twoFactor retorna vazio; emailAndPassword nao configura verificacao.',
    evidence: ['src/lib/auth.ts:101-104', 'emailAndPassword: { enabled: true, autoSignIn: true }  // sem recovery/2FA', 'grep forget-password|resetPassword|deleteUser|twoFactor em src/: vazio'],
    analysis: 'O que acontece: nada - os fluxos nao existem. Por que: nunca implementados; recuperacao depende de SMTP externo (mesmo bloqueador do e-mail de verificacao). A entrada do usuario nao chega a ponto vulneravel porque o ponto nao existe. Protecoes existentes (troca de senha autenticada com senha atual + revokeOtherSessions) cobrem apenas usuarios logados.',
    condition: 'Nao exploravel por terceiros (sem pre-condicao de atacante): o risco e lockout permanente se o usuario esquecer a senha (recuperacao so via banco) e ausencia de self-service para exclusao (LGPD art. 18).',
    impact: 'Disponibilidade da propria conta e conformidade de privacidade. Sem impacto em confidencialidade/integridade de dados de terceiros.',
    fix: 'Ativar forgetPassword do better-auth + SMTP; criar endpoint de exclusao de conta com purge em cascata (reuso dos purges existentes); avaliar plugin TOTP de 2FA.',
  },
];

const STRENGTH_GROUPS = [
  ['Autenticacao', [
    'Sessao recuperada server-side via better-auth em todas as rotas de API e no layout (app) com redirect (src/app/(app)/layout.tsx; src/app/login/page.tsx; src/app/register/page.tsx).',
    'Rate limit do better-auth habilitado (auth.ts:26-30); endpoints de sign-in/sign-up/change-password com regra especial 3 req/10s (fonte instalada da lib).',
    'Origens confiaveis por ambiente, sem localhost em producao (auth.ts:18-24); segredo de sessao validado no boot (auth.ts:6-10).',
    'Troca de senha exige a senha atual e revoga as demais sessoes (ChangePasswordForm.tsx:43-47); callbackURL e redirects fixos, sem open redirect.',
  ]],
  ['Autorizacao', [
    'NÃO APLICÁVEL por desenho: modelo User sem campo de papel e nenhum gate de role no frontend (grep role/isAdmin vazio); privilegio unico para todo usuario autenticado; nenhum endpoint administrativo existe.',
  ]],
  ['Isolamento', [
    'Filtro manual por userId em 100% dos 53 acessos Prisma (8 arquivos de rota); sem listagens, agregacoes, relatorios ou export sem escopo de dono.',
  ]],
  ['Protecao contra IDOR', [
    'PUT/DELETE validam posse via findFirst/updateMany/deleteMany com userId; updates por id precedidos de findFirst (ex: tasks/route.ts:351-360); reorder com pre-contagem ownedCount === ids.length (tasks/route.ts:301-307); restore/purge exigem deletedAt + userId; vinculos com checagem de posse (tasks/route.ts:43-48; notes/route.ts:94-113,208-226; timer/route.ts:84-93; subtasks/route.ts:7-9).',
  ]],
  ['Gestao de segredos', [
    'Segredos apenas via env; .env nunca commitado (historico verificado); .env.example so com placeholders; CI com URL dummy local; sem NEXT_PUBLIC; Google OAuth com secret restrito ao servidor (auth.ts:88-97); sem chaves no bundle.',
  ]],
  ['Sanitizacao/XSS', [
    'Zero sinks (sem dangerouslySetInnerHTML/innerHTML/eval/markdown) nos 18 componentes; conteudo de usuario renderizado como nos de texto do React; sem URLs controladas pelo usuario em href/src (apenas blob: local e link fixo); sem e-mail/HTML no backend.',
  ]],
  ['Infraestrutura', [
    'Security headers (next.config.ts); CSRF via Origin check em 16 handlers + cookies HttpOnly/SameSite-Lax/Secure; sem Docker/Helm/Terraform; deploy Vercel + CI com lint, typecheck, testes e build.',
  ]],
];

const COVERAGE = [
  ['Autenticacao', 'auth.ts, auth-client, Login/Register/Logout/ChangePassword, api/auth, login/register pages', 'todas as rotas', 'Protegido'],
  ['Autorizacao', 'schema User, grep de papeis, todos os endpoints', 'todas', 'N/A (sem papeis)'],
  ['Isolamento', '7 rotas de API, 53 acessos Prisma', 'todos os GETs/agregacoes', 'Protegido'],
  ['IDOR', '16 handlers de mutacao + GETs por ID', 'todos por ID', 'Protegido'],
  ['Segredos', 'codigo, CI, git log, bundle', '—', 'Protegido'],
  ['XSS', '18 componentes + saidas da API', 'todas as telas', 'Protegido'],
  ['Conta/ciclo de vida', 'auth + grep de fluxos', '—', '1 info'],
];

const RECOMMENDATIONS = [
  ['P1', 'Nenhuma correcao imediata exigida: zero achados criticos/altos/medios/baixos nesta auditoria.'],
  ['P2', 'Ciclo de vida da conta (SEC-001): configurar SMTP e ativar recuperacao de senha + verificacao de e-mail; criar exclusao de conta self-service.'],
  ['P3', 'Manter Dependabot semanal e npm audit periodico; reauditar apos mudancas em auth, rotas ou dependencias criticas.'],
  ['P4', 'Hardening futuro: expiracao/auto-purge da lixeira, indices compostos (userId, projectId), avaliacao de 2FA TOTP.'],
];

const CATEGORY_BARS = [
  { label: '1. Isolamento', value: 0 },
  { label: '2. Permissao', value: 0 },
  { label: '3. IDOR', value: 0 },
  { label: '4. Segredos', value: 0 },
  { label: '5. XSS', value: 0 },
  { label: '6. Conta', value: 1 },
];

const REVALIDATION = [
  ['A1 (media)', 'clientKey usa x-real-ip/ultimo XFF + tests/rate-limit.test.ts', 'Corrigido'],
  ['A2 (media)', 'reorderSchema .max(200) + teste', 'Corrigido'],
  ['A3 (baixa)', 'trustedOrigins sem localhost em prod', 'Corrigido'],
  ['A4 (baixa)', 'cadastro generico + rateLimit better-auth', 'Corrigido'],
  ['A5 (baixa)', 'assert de secret no boot + CI dummy', 'Corrigido'],
  ['A6 (baixa)', 'isUuid nos GETs (400)', 'Corrigido'],
  ['A7 (info)', 'documentado; bloqueado p/ SMTP', 'Pendente ext.'],
  ['A8 (info)', 'Dependabot + npm run audit', 'Corrigido'],
];

const ISSUES = [
  { n: 1, title: '[Segurança] Ciclo de vida da conta: sem recuperação de senha, exclusão ou 2FA', labels: 'security\ninformativa',
    sections: [
      ['h', 'Descrição'],
      ['p', 'A aplicação não possui recuperação de senha self-service, exclusão de conta self-service nem autenticação em dois fatores. O objeto de configuração emailAndPassword (src/lib/auth.ts:101-104) não habilita nenhum desses fluxos, e a busca por forget-password, resetPassword, deleteUser e twoFactor em src/ retorna vazio.'],
      ['h', 'Por que é explorável'],
      ['p', 'Não é explorável por terceiros (não há ponto de entrada): o risco é operacional — lockout permanente em caso de senha esquecida (recuperação só via banco) e ausência de self-service para exclusão (LGPD art. 18). Por isso a severidade INFORMATIVA.'],
      ['h', 'Evidência'],
      ['p', 'src/lib/auth.ts:101-104'],
      ['code', ['```ts', 'emailAndPassword: { enabled: true, autoSignIn: true }  // sem recovery/2FA', '```']],
      ['h', 'Impacto'],
      ['p', 'Disponibilidade da própria conta e conformidade de privacidade. Sem impacto em confidencialidade/integridade de terceiros.'],
      ['h', 'Sugestão de correção'],
      ['p', 'Ativar forgetPassword do better-auth com provedor SMTP (mesmo bloqueador do e-mail de verificação); criar endpoint DELETE de conta com purge em cascata; avaliar plugin TOTP.'],
      ['h', 'Critérios de aceite'],
      ['p', '* [ ] Fluxo de recuperação funcional de ponta a ponta\n* [ ] Exclusão remove todos os dados do usuário\n* [ ] Teste automatizado cobrindo o cenário\n* [ ] Verificação de regressão realizada'],
    ] },
];

/* ------------------------------ utilidades ------------------------------ */

function newDoc() {
  return new PDFDocument({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 }, bufferPages: true, info: {
    Title: 'Relatorio de Auditoria de Seguranca - lista-de-tarefas',
    Author: 'Auditoria tecnica de codigo',
  } });
}

let doc;
function newPage(first) {
  if (!first) doc.addPage();
  doc.y = M.top;
}
function need(h) {
  if (doc.y + h > LIMIT_Y) newPage(false);
}
function rule() {
  doc.strokeColor('#E5E7EB').lineWidth(1)
    .moveTo(M.left, doc.y).lineTo(M.left + CONTENT_W, doc.y).stroke();
  doc.y += 8;
}
function h1(t) { need(30); doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.ink).text(t, M.left, doc.y, { width: CONTENT_W }); doc.y += 8; rule(); }
function h2(t) { need(24); doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.ink).text(t, M.left, doc.y, { width: CONTENT_W }); doc.y += 6; }
function h3(t) { need(20); doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.ink).text(t, M.left, doc.y, { width: CONTENT_W }); doc.y += 5; }
function para(t, opts) {
  const o = Object.assign({ size: 9.5, color: COLORS.ink, gap: 5, align: 'justify' }, opts || {});
  doc.font('Helvetica').fontSize(o.size).fillColor(o.color);
  const h = doc.heightOfString(t, { width: CONTENT_W, align: o.align });
  need(h + o.gap);
  doc.text(t, M.left, doc.y, { width: CONTENT_W, align: o.align });
  doc.y += o.gap;
}
function bullets(items, size) {
  const s = size || 9;
  for (const it of items) {
    doc.font('Helvetica').fontSize(s).fillColor(COLORS.ink);
    const h = doc.heightOfString(it, { width: CONTENT_W - 14 });
    need(h + 4);
    doc.text('-', M.left, doc.y, { width: 10 });
    doc.text(it, M.left + 14, doc.y, { width: CONTENT_W - 14, align: 'justify' });
    doc.y += 4;
  }
  doc.y += 4;
}
function codeLines(lines) {
  doc.font('Courier').fontSize(8).fillColor('#374151');
  for (const ln of lines) {
    const h = doc.heightOfString(ln === '' ? ' ' : ln, { width: CONTENT_W - 20 });
    need(h + 6);
    doc.save().rect(M.left + 4, doc.y - 2, CONTENT_W - 8, h + 5).fill('#F3F4F6').restore();
    if (ln !== '') doc.text(ln, M.left + 10, doc.y, { width: CONTENT_W - 20 });
    else doc.y += h;
    doc.y += 4;
  }
  doc.y += 4;
}

/* -------------------------------- graficos ------------------------------ */

function donut(cx, cy, r, segments, centerLabel) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) {
    doc.save().circle(cx, cy, r).strokeColor('#9CA3AF').lineWidth(10).stroke().restore();
  } else if (segments.length === 1) {
    doc.save().circle(cx, cy, r).fill(segments[0].color).restore();
  } else {
    let a = -Math.PI / 2;
    for (const s of segments) {
      const sweep = (s.value / total) * Math.PI * 2;
      const a0 = a, a1 = a + sweep; a = a1;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const laf = sweep > Math.PI ? 1 : 0;
      doc.save().path(`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${laf} 1 ${x1} ${y1} Z`).fill(s.color).restore();
    }
  }
  doc.save().circle(cx, cy, r * 0.58).fill('#FFFFFF').restore();
  doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.ink)
    .text(String(total), cx - r, cy - 14, { width: r * 2, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray)
    .text(centerLabel, cx - r, cy + 8, { width: r * 2, align: 'center' });
}

function legend(x, y, items) {
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.ink);
  let yy = y;
  for (const it of items) {
    doc.save().rect(x, yy, 11, 11).fill(it.color).restore();
    doc.text(it.label, x + 17, yy - 1.5);
    yy += 20;
  }
  return yy;
}

function bars(x, y, rows, maxW) {
  const max = Math.max.apply(null, rows.map((r) => r.value).concat([1]));
  let yy = y;
  for (const r of rows) {
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.ink);
    doc.text(r.label, x, yy, { width: 165 });
    const bw = maxW - 200;
    const w = r.value === 0 ? 0 : Math.max(26, (r.value / max) * bw);
    if (r.value === 0) {
      doc.save().rect(x + 170, yy + 1, 26, 12).strokeColor('#9CA3AF').lineWidth(1).stroke().restore();
    } else {
      doc.save().rect(x + 170, yy + 1, w, 12).fill('#334155').restore();
    }
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink)
      .text(String(r.value), x + 170 + Math.max(w, 26) + 8, yy - 1);
    yy += 24;
  }
  return yy;
}

/* --------------------------------- tabelas ------------------------------ */

function chip(x, y, label, color) {
  doc.save().roundedRect(x, y, 58, 15, 4).fill(color).restore();
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
    .text(label, x, y + 3.2, { width: 58, align: 'center' });
}

function findingsTable() {
  const cId = 56, cCat = 86, cSev = 66, cFile = 118, cDesc = CONTENT_W - cId - cCat - cSev - cFile;
  const X = [M.left, M.left + cId, M.left + cId + cCat, M.left + cId + cCat + cSev, M.left + cId + cCat + cSev + cFile];
  const W = [cId, cCat, cSev, cFile, cDesc];
  const H = ['ID', 'CATEGORIA', 'SEVERIDADE', 'ARQUIVO:LINHA', 'DESCRICAO'];
  function header() {
    doc.save().rect(M.left, doc.y, CONTENT_W, 20).fill(COLORS.ink).restore();
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
    H.forEach((t, i) => doc.text(t, X[i] + 4, doc.y + 5.5, { width: W[i] - 8 }));
    doc.y += 20;
  }
  need(30); header();
  FINDINGS.forEach((f, i) => {
    const m = SEV_META[f.sev];
    doc.font('Courier').fontSize(7);
    const hFile = doc.heightOfString(f.file, { width: cFile - 8 });
    doc.font('Helvetica').fontSize(8.5);
    const hDesc = doc.heightOfString(f.desc, { width: cDesc - 8 });
    const rowH = Math.max(26, hFile, hDesc) + 10;
    need(rowH + 2);
    if (i % 2 === 1) doc.save().rect(M.left, doc.y, CONTENT_W, rowH).fill('#F9FAFB').restore();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.ink)
      .text(f.id, X[0] + 4, doc.y + 5, { width: W[0] - 8 });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.ink)
      .text(f.cat, X[1] + 4, doc.y + 5, { width: W[1] - 8 });
    chip(X[2] + 4, doc.y + (rowH - 15) / 2, m.label, m.color);
    doc.font('Courier').fontSize(7).fillColor('#374151')
      .text(f.file, X[3] + 4, doc.y + 5, { width: W[3] - 8 });
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.ink)
      .text(f.desc, X[4] + 4, doc.y + 5, { width: W[4] - 8, align: 'left' });
    doc.y += rowH;
    doc.save().strokeColor('#E5E7EB').lineWidth(0.5)
      .moveTo(M.left, doc.y).lineTo(M.left + CONTENT_W, doc.y).stroke().restore();
  });
  doc.y += 6;
}

function simpleTable(headers, rows, widths) {
  const X = [M.left];
  for (let i = 1; i < widths.length; i++) X.push(X[i - 1] + widths[i - 1]);
  doc.save().rect(M.left, doc.y, CONTENT_W, 20).fill(COLORS.ink).restore();
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
  headers.forEach((t, i) => doc.text(t, X[i] + 4, doc.y + 5.5, { width: widths[i] - 8 }));
  doc.y += 20;
  rows.forEach((r, i) => {
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.ink);
    let h = 0;
    r.forEach((c, j) => { h = Math.max(h, doc.heightOfString(c, { width: widths[j] - 8 })); });
    const rowH = h + 10;
    need(rowH + 2);
    if (i % 2 === 1) doc.save().rect(M.left, doc.y, CONTENT_W, rowH).fill('#F9FAFB').restore();
    r.forEach((c, j) => doc.text(c, X[j] + 4, doc.y + 5, { width: widths[j] - 8 }));
    doc.y += rowH;
    doc.save().strokeColor('#E5E7EB').lineWidth(0.5)
      .moveTo(M.left, doc.y).lineTo(M.left + CONTENT_W, doc.y).stroke().restore();
  });
  doc.y += 6;
}

/* --------------------------------- paginas ------------------------------ */

function cover() {
  newPage(true);
  doc.y = 190;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.gray)
    .text('AUDITORIA DE SEGURANCA', M.left, doc.y, { width: CONTENT_W, align: 'center' });
  doc.y += 26;
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.ink)
    .text('Relatorio de Auditoria de Seguranca', M.left, doc.y, { width: CONTENT_W, align: 'center' });
  doc.y += 14;
  doc.font('Helvetica').fontSize(20).fillColor(COLORS.gray)
    .text('lista-de-tarefas', M.left, doc.y, { width: CONTENT_W, align: 'center' });
  doc.y += 28; rule();
  para('Data: 18/09/2026. Escopo: rotas de API (src/app/api), frontend (src/components, src/app), autenticacao e banco (src/lib, prisma), CI e historico git. Snapshot auditado: HEAD efc8dda + ajuste em globals.css.', { align: 'center', size: 9.5, color: COLORS.gray });
  para('Stack: TypeScript + Next.js 16 App Router, Prisma + PostgreSQL sem RLS, better-auth com sessoes em cookie, deploy Vercel, CI GitHub Actions. Sem Docker/Helm/Terraform, sem upload de arquivos, sem server actions.', { align: 'center', size: 9.5, color: COLORS.gray });
  para('Metodologia: (1) isolamento = filtro manual por userId; (2) permissao = N/A por desenho, sem papeis no modelo; (3) IDOR = todos os handlers por ID, sem amostragem; (4) segredos = grep + historico git + bundle; (5) XSS = sinks do React + URLs + saidas do backend. Segunda passagem de validacao + sondas empiricas em producao (filtros UUID). So reportado o comprovado no codigo.', { align: 'center', size: 9.5, color: COLORS.gray });
}

function executive() {
  newPage(false); h1('Resumo executivo');
  para('Auditoria completa sem amostragem: 8 arquivos de rota (53 acessos ao banco), 18 componentes, configuracao de auth, CI e historico git. Resultado: 0 criticas, 0 altas, 0 medias, 0 baixas e 1 informativa. Nenhuma vulnerabilidade exploravel encontrada; o unico registro e uma observacao de ciclo de vida da conta (sem recuperacao de senha, exclusao ou 2FA).');
  h2('Achados por severidade');
  need(150);
  const cy = doc.y + 62;
  donut(M.left + 85, cy, 58, [{ value: 1, color: COLORS.info }], 'achado');
  legend(M.left + 200, cy - 22, [{ color: COLORS.info, label: 'Info - 1 achado' }]);
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.gray)
    .text('0 criticas, 0 altas, 0 medias, 0 baixas.', M.left + 200, cy + 12);
  doc.y = cy + 78;
  h2('Achados por categoria');
  need(180);
  const yEnd = bars(M.left, doc.y, CATEGORY_BARS.map((b) => Object.assign({}, b)), CONTENT_W);
  doc.y = yEnd + 4;
  para('Categorias 1 a 5 zeradas: isolamento, IDOR, segredos e XSS integros; categoria 2 nao se aplica (sem papeis). Pontos fortes verificados: 14.', { size: 8.5, color: COLORS.gray });
}

function strengths() {
  newPage(false); h1('Pontos fortes');
  for (const g of STRENGTH_GROUPS) {
    h2(g[0]);
    bullets(g[1], 9);
  }
}

function weakAndTable() {
  newPage(false); h1('Pontos fracos');
  para('Sem linguagem alarmista: ha um unico ponto de atencao, informativo e nao exploravel por terceiros - o ciclo de vida da conta (SEC-001). Todo o resto verificado esta protegido, conforme a matriz de cobertura.');
  h2('Tabela de achados');
  findingsTable();
}

function detailing() {
  for (const f of FINDINGS) {
    const m = SEV_META[f.sev];
    newPage(false);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.ink);
    need(26);
    doc.text('[' + f.id + '] ' + f.title, M.left, doc.y, { width: CONTENT_W });
    doc.y += 8; rule();
    const kv = [['Categoria:', f.cat], ['Severidade:', m.label], ['Arquivo:', f.file], ['Linha:', f.file.split(':').slice(1).join(':') || '—'], ['Rota/Funcao:', f.route]];
    for (const k of kv) {
      need(16);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.ink).text(k[0] + ' ', M.left, doc.y, { continued: true });
      doc.font('Helvetica').fontSize(9.5).text(k[1]);
      doc.y += 2;
    }
    doc.y += 4;
    h3('Evidencia'); codeLines(f.evidence);
    h3('Analise'); para(f.analysis);
    h3('Condicao de exploracao'); para(f.condition);
    h3('Impacto'); para(f.impact);
    h3('Correcao recomendada'); para(f.fix);
  }
}

function coverage() {
  newPage(false); h1('Matriz de cobertura');
  simpleTable(['AREA', 'ARQUIVOS / ROTAS', 'RESULTADO'],
    COVERAGE.map((c) => [c[0], c[1] + ' | ' + c[2], c[3]]),
    [110, CONTENT_W - 110 - 110, 110]);
  para('Nao verificado a partir do codigo (limitacao declarada): variaveis de ambiente do dashboard Vercel, backups do Postgres gerenciado e TLS do provedor de banco.', { size: 8.5, color: COLORS.gray });
}

function recommendations() {
  newPage(false); h1('Recomendacoes priorizadas');
  const groups = [
    ['P1 - Acao imediata', 'Nenhuma exigida: zero achados criticos/altos/medios/baixos.'],
    ['P2 - Alta prioridade', 'SEC-001: configurar SMTP e ativar recuperacao de senha + verificacao de e-mail; criar exclusao de conta self-service.'],
    ['P3 - Importante', 'Manter Dependabot semanal e npm audit periodico; reauditar apos mudancas em auth, rotas ou dependencias.'],
    ['P4 - Hardening futuro', 'Expiracao/auto-purge da lixeira, indices compostos (userId, projectId), avaliacao de 2FA TOTP.'],
  ];
  for (const g of groups) {
    need(30);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text(g[0], M.left, doc.y, { width: CONTENT_W });
    doc.y += 2;
    para(g[1], { size: 9.5 });
  }
}

function revalidation() {
  newPage(false); h1('Apendice: revalidacao da auditoria anterior');
  para('Os 8 achados da auditoria anterior (A1-A8) foram recorrigidos e revalidados nesta passagem:');
  simpleTable(['ACHADO', 'EVIDENCIA DA CORRECAO', 'STATUS'],
    REVALIDATION.map((r) => [r[0], r[1], r[2]]),
    [90, CONTENT_W - 90 - 100, 100]);
}

function issues() {
  newPage(false); h1('Issues para o GitHub');
  para('Texto pronto para copiar e colar, entre os marcadores --- ISSUE n --- e --- FIM ISSUE n ---.');
  for (const is of ISSUES) {
    need(60);
    doc.font('Courier-Bold').fontSize(9).fillColor(COLORS.gray)
      .text('--- ISSUE ' + is.n + ' ---', M.left, doc.y);
    doc.y += 14;
    h3('# ' + is.title);
    for (const b of is.sections) {
      if (b[0] === 'h') {
        need(18);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.ink).text('## ' + b[1], M.left, doc.y, { width: CONTENT_W });
        doc.y += 4;
      } else if (b[0] === 'p') {
        para(b[1], { size: 9 });
      } else if (b[0] === 'code') {
        codeLines(b[1]);
      }
    }
    if (is.labels) { para('Labels sugeridas: ' + is.labels, { size: 9 }); }
    doc.font('Courier-Bold').fontSize(9).fillColor(COLORS.gray);
    need(16);
    doc.text('--- FIM ISSUE ' + is.n + ' ---', M.left, doc.y);
    doc.y += 20;
  }
}

/* -------------------------------- moldura ------------------------------- */

function stamp() {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    if (i > 0) {
      doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF')
        .text('Relatorio de Auditoria de Seguranca - lista-de-tarefas', M.left, 38, { width: CONTENT_W, align: 'right' });
      doc.save().strokeColor('#E5E7EB').lineWidth(0.5)
        .moveTo(M.left, 52).lineTo(M.left + CONTENT_W, 52).stroke().restore();
    }
    doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF')
      .text('Relatorio de Auditoria de Seguranca  |  Pagina ' + (i + 1) + ' de ' + range.count,
        M.left, PAGE.h - 42, { width: CONTENT_W, align: 'center' });
  }
}

function build() {
  doc = newDoc();
  const done = new Promise((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);
  });
  doc.pipe(fs.createWriteStream(OUT_PDF));
  cover();
  executive();
  strengths();
  weakAndTable();
  detailing();
  coverage();
  recommendations();
  revalidation();
  issues();
  stamp();
  doc.end();
  return done;
}

/* ------------------------------ verificacao ----------------------------- */

async function verify() {
  let pdfParse;
  try {
    const mod = require('pdf-parse');
    pdfParse = mod.default || mod;
  } catch {
    console.error('ERRO: pdf-parse nao encontrado no NODE_PATH.');
    process.exit(1);
  }
  if (typeof pdfParse !== 'function') { console.error('ERRO: pdf-parse incompativel.'); process.exit(1); }
  if (!fs.existsSync(OUT_PDF)) { console.error('ERRO: PDF nao existe: ' + OUT_PDF); process.exit(1); }
  const buf = fs.readFileSync(OUT_PDF);
  console.log('tamanho (bytes): ' + buf.length);
  const data = await pdfParse(buf);
  console.log('paginas: ' + data.numpages);
  const must = ['Resumo executivo', 'Pontos fortes', 'Pontos fracos', 'Tabela de achados',
    'SEC-001', 'Matriz de cobertura', 'Recomendacoes priorizadas', 'Apendice',
    'Issues para o GitHub', '--- ISSUE 1 ---', '--- FIM ISSUE 1 ---',
    'Labels sugeridas', 'Critérios de aceite', 'Verificação de regressão',
    'Pagina ' + data.numpages + ' de ' + data.numpages];
  let ok = true;
  for (const m of must) {
    const found = data.text.indexOf(m) !== -1;
    console.log((found ? 'OK   ' : 'FALTA') + '  ' + m);
    if (!found) ok = false;
  }
  if (data.numpages < 6) { console.log('FALTA  numero minimo de paginas'); ok = false; }
  if (buf.length < 12000) { console.log('FALTA  tamanho minimo suspeito'); ok = false; }
  console.log(ok ? 'VERIFICACAO: PASS' : 'VERIFICACAO: FAIL');
  process.exit(ok ? 0 : 1);
}

(async () => {
  if (process.argv.indexOf('--verificar') !== -1) { await verify(); return; }
  await build();
  console.log('PDF gerado: ' + OUT_PDF);
})();
