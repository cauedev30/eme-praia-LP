# Painel — Fase 2 (Cloudflare Access + tela de estoque + site reagindo) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Mayara abre `eme-praia-painel.pedidos-jp.workers.dev` no celular, entra com código no e-mail, vê os produtos e toca num tamanho adulto pra alternar disponível/esgotado; por produto, uma chave "Tem versão kids". A loja reflete o toque em até 30 s, sem rebuild.

**Architecture:** O Worker `eme-praia-painel` (Hono) ganha um middleware que exige identidade do Cloudflare Access, uma tela em HTML gerada por JSX do Hono e uma API de escrita com dois `PATCH` validados por Zod. O Worker da loja ganha `GET /api/disponibilidade.json` (30 s de cache). No site, um `DisponibilidadeProvider` busca esse JSON no navegador e `useProdutoAoVivo(produto)` entrega aos cards e à página do produto o produto com `tamanhos` e `temKids` corrigidos.

**Tech Stack:** O da Fase 1 (Next 14 estático, Hono 4.13, Zod 4.6, wrangler 4.131, `@cloudflare/vitest-plugin` 1.1, Vitest 4). Novo: `@hono/zod-validator` 0.9.1 no painel. Cloudflare Access (Zero Trust, plano grátis) configurado no dashboard.

Spec: `docs/superpowers/specs/2026-09-14-painel-fases-1-2-design.md`
Pré-requisito: Fase 1 mesclada em `main` (plano `2026-09-14-painel-fase-1.md`).

## Global Constraints

- Todo comando roda na pasta indicada em cada step (`loja/` ou `painel/`). Os `git` rodam na raiz do repo `eme-praia`. Comandos são pra Git Bash.
- Commits saem da conta `cauefranco01@gmail.com`. Toda mensagem termina com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Nada do MazyOS entra neste repo.** `git rev-parse --show-toplevel` tem que devolver `.../clientes/eme-praia`.
- Branch de trabalho: `painel-fase-2`, a partir de `main`.
- **Task 0 é bloqueante.** Nenhuma linha do painel é escrita antes do teste do Access ter passado num celular que não é o do Cauê (decisão 11).
- Nomes fixos: Worker `eme-praia-painel`; binding `DB`; variável `SEM_ACCESS` (só em `.dev.vars` e nos testes; nunca em produção).
- Rotas de escrita: `PATCH /api/produtos/:id/tamanhos/:tamanho` com `{ disponivel: boolean }`; `PATCH /api/produtos/:id` com `{ temKids: boolean }`. 400 corpo inválido, 404 não encontrado, 403 sem identidade. Sucesso devolve 200 com o estado gravado.
- Formato de `/api/disponibilidade.json`: `{ [slug]: { temKids: boolean, tamanhos: { [tamanho]: boolean } } }`, só produtos ativos, `Cache-Control: public, max-age=30, s-maxage=30`.
- Texto do aviso de falha, literal: `Não salvou. Tenta de novo.` Rótulo da chave, literal: `Tem versão kids`.
- Cores da marca (de `loja/tailwind.config.ts`): laranja `#FB7F20`, terra `#B35207`, grafite `#323233`, breu `#1F1F20`, gelo `#FAFAFA`, concha `#E7E6E2`. Regra: laranja preenche, terra escreve (decisão 12).
- Alvo de toque mínimo 44 x 44 px.
- Estado local do wrangler: sempre `--persist-to ../.wrangler-state`.
- Sem emojis em código, docs ou commits. Comentários de código sem acento (padrão do repo).

---

### Task 0: Teste do Access num Worker descartável (decisão 11)

Esta task é do Cauê com o controller. O código é de dez linhas; o que se testa é o dashboard e o celular.

**Files:**
- Nenhum no repo. O Worker de rascunho vive fora do repo (na pasta de scratchpad da sessão) e é apagado no fim.
- Modify (no fim): `docs/decisoes.md` (resultado na decisão 11)

- [ ] **Step 1: Worker de rascunho**

Numa pasta temporária **fora** do repo (ex.: o scratchpad da sessão), criar `acesso-teste/wrangler.jsonc`:

```jsonc
{
  "name": "acesso-teste",
  "main": "index.js",
  "compatibility_date": "2026-09-01"
}
```

e `acesso-teste/index.js`:

```js
// Teste da decisao 11. Se o Access estiver ligado neste Worker, ctx.access
// existe e getIdentity() devolve quem logou. Sem Access, ctx.access e undefined.
export default {
  async fetch(request, env, ctx) {
    if (!ctx.access) return new Response('sem Access neste pedido', { status: 403 })
    const identidade = await ctx.access.getIdentity()
    return new Response(`logado como ${identidade?.email ?? '(sem e-mail)'}`)
  },
}
```

Run (em `acesso-teste/`): `npx wrangler@4.131.2 deploy`
Expected: `https://acesso-teste.pedidos-jp.workers.dev`.

Run: `curl -s -w "\n%{http_code}\n" https://acesso-teste.pedidos-jp.workers.dev/`
Expected: `sem Access neste pedido` e `403`. (Prova que o Worker fecha sozinho quando o Access não está na frente.)

- [ ] **Step 2: Ligar o Access no dashboard (Cauê)**

1. `dash.cloudflare.com` → Workers & Pages → `acesso-teste` → aba **Access** → **Protect this Worker behind Access** → **All traffic**.
2. Se for a primeira vez usando Zero Trust na conta, o dashboard pede um nome de time (vira `<time>.cloudflareaccess.com`) e o plano grátis. Anotar o nome do time.
3. A política inicial oferece "Cloudflare account" ou "Email domain". Escolher qualquer uma pra criar, depois **Apply Access**.
4. Zero Trust → Access → Applications → `acesso-teste` → Policies → editar a política: Action **Allow**, Include → **Emails** → o e-mail do Cauê **e** o e-mail da Mayara. Salvar.
5. Zero Trust → Settings → Authentication → conferir que **One-time PIN** está entre os métodos (é o padrão).

- [ ] **Step 3: Login do celular emprestado**

Num celular que **não** é o do Cauê (ou o da Mayara, com o e-mail dela): abrir `https://acesso-teste.pedidos-jp.workers.dev/`.

Expected, na ordem:
1. Tela do Cloudflare Access pedindo e-mail.
2. Código de 6 dígitos chega no e-mail em menos de 1 minuto.
3. Depois do código, a página mostra `logado como <o e-mail digitado>`.
4. Testar um e-mail **fora** da política: o Access recusa antes de mandar código, ou manda e recusa depois. Qualquer um dos dois serve.

Anotar: quanto tempo o código levou; se a tela do Access foi legível no celular; se pediu algo confuso.

- [ ] **Step 4: Registrar e apagar**

Em `docs/decisoes.md`, na decisão 11, substituir o parágrafo que começa com **Verificar antes de escrever qualquer linha do painel** por:

```markdown
**Verificado em <data> num <modelo do celular>, e-mail <qual>.** Código
chegou em <tempo>; a tela do Access funcionou no celular; o Worker leu o
e-mail com `ctx.access.getIdentity()`. E-mail fora da política foi recusado.
O Worker de teste foi apagado.
```

(preencher os quatro campos com o que aconteceu.)

Run (em `acesso-teste/`): `npx wrangler@4.131.2 delete`
Expected: Worker removido. Conferir em Zero Trust → Access → Applications que a aplicação `acesso-teste` sumiu; se ficou, apagar à mão.

Run (raiz do repo):
```bash
git checkout -b painel-fase-2
git add docs/decisoes.md
git commit -m "docs: decisao 11 verificada — Access por codigo no e-mail funciona no celular

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

**Se falhar:** `ctx.access` indefinido mesmo com Access ligado → parar e avisar o Cauê; o plano B é validar o header `Cf-Access-Jwt-Assertion` com a chave pública em `https://<time>.cloudflareaccess.com/cdn-cgi/access/certs`, e a Task 1 precisa ser reescrita. Login travando no celular → parar; o caminho C (magic link próprio) precisa de spec novo.

---

### Task 1: Base do painel — middleware do Access e testes com D1 em memória

**Files:**
- Modify: `painel/src/index.ts`
- Create: `painel/src/acesso.ts`
- Create: `painel/src/acesso.test.ts`
- Create: `painel/src/apply-migrations.ts`
- Create: `painel/src/env.d.ts`
- Create: `painel/vitest.config.ts`
- Create: `painel/.dev.vars`
- Create: `painel/.dev.vars.example`
- Modify: `painel/package.json` (devDependencies, script `test`)
- Modify: `painel/tsconfig.json` (types do plugin)

**Interfaces:**
- Produces: `Env = { DB: D1Database; SEM_ACCESS?: string }` e `Variaveis = { email: string }` em `src/index.ts`; `app: Hono<{ Bindings: Env; Variables: Variaveis }>` exportado (named) além do `export default app`; middleware `exigirAccess` em `src/acesso.ts`. Tasks 2 e 3 registram rotas em `app`.

- [ ] **Step 1: Dependências de teste**

Run (em `painel/`):
```bash
npm install --save-dev @cloudflare/vitest-plugin@1.1.9 vitest@4
```

Em `painel/package.json`, em `"scripts"`, adicionar:

```json
    "test": "vitest run"
```

Em `painel/tsconfig.json`, trocar a linha `"types"` por:

```json
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-plugin/types"],
```

- [ ] **Step 2: Vitest com as migrations do próprio painel**

Criar `painel/vitest.config.ts`:

```ts
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

// Os testes rodam dentro do workerd com um D1 em memoria que recebe as
// migrations desta pasta (schema + seed). Cada teste comeca do seed.
const raiz = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(raiz, 'migrations'))
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      }),
    ],
    test: {
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      setupFiles: ['./src/apply-migrations.ts'],
    },
  }
})
```

Criar `painel/src/apply-migrations.ts`:

```ts
import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
```

Criar `painel/src/env.d.ts`:

```ts
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    SEM_ACCESS?: string
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }
}
```

- [ ] **Step 3: Teste do middleware (falhando)**

Criar `painel/src/acesso.test.ts`:

```ts
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { app } from './index'

// Um ExecutionContext falso. Hono passa isso adiante como c.executionCtx.
function ctx(access?: { getIdentity(): Promise<{ email?: string } | null> }) {
  return { waitUntil() {}, passThroughOnException() {}, props: {}, access } as unknown as ExecutionContext
}

describe('exigirAccess', () => {
  it('sem identidade do Access responde 403', async () => {
    const r = await app.request('/', {}, { DB: env.DB }, ctx())
    expect(r.status).toBe(403)
    expect(await r.text()).toContain('Access')
  })

  it('com identidade do Access passa', async () => {
    const r = await app.request('/', {}, { DB: env.DB }, ctx({ getIdentity: async () => ({ email: 'mayara@exemplo.com' }) }))
    expect(r.status).toBe(200)
  })

  it('identidade sem e-mail e recusada', async () => {
    const r = await app.request('/', {}, { DB: env.DB }, ctx({ getIdentity: async () => ({}) }))
    expect(r.status).toBe(403)
  })

  it('SEM_ACCESS=1 pula a checagem (so em dev local)', async () => {
    const r = await app.request('/', {}, { DB: env.DB, SEM_ACCESS: '1' }, ctx())
    expect(r.status).toBe(200)
  })
})
```

Run (em `painel/`): `npm test`
Expected: FAIL, `app` não é exportado de `./index` (só existe `default`).

- [ ] **Step 4: Middleware e app**

Criar `painel/src/acesso.ts`:

```ts
import type { MiddlewareHandler } from 'hono'

// Defesa em profundidade. O Access bloqueia na borda, antes deste codigo
// rodar; mas se alguem desligar a protecao no dashboard por engano, este
// middleware fecha o painel em vez de deixar aberto.
//
// ctx.access so existe quando o pedido passou pelo Access
// (docs: workers/configuration/cloudflare-access). Nao propaga por service
// binding, mas o painel nao usa nenhum.

type Identidade = { email?: string }
type CtxComAccess = ExecutionContext & {
  access?: { getIdentity(): Promise<Identidade | null> }
}

export type Env = {
  DB: D1Database
  /** So em .dev.vars. Nunca em producao. */
  SEM_ACCESS?: string
}

export type Variaveis = { email: string }

export const exigirAccess: MiddlewareHandler<{ Bindings: Env; Variables: Variaveis }> = async (c, next) => {
  if (c.env.SEM_ACCESS === '1') {
    c.set('email', 'dev@local')
    return next()
  }

  let ctx: CtxComAccess | undefined
  try {
    ctx = c.executionCtx as CtxComAccess
  } catch {
    ctx = undefined // app.request() sem contexto
  }

  const identidade = await ctx?.access?.getIdentity().catch(() => null)
  if (!identidade?.email) {
    return c.text('Painel sem Cloudflare Access na frente. Ver docs/runbook-caue.md.', 403)
  }

  c.set('email', identidade.email)
  await next()
}
```

Substituir `painel/src/index.ts` por:

```ts
import { Hono } from 'hono'
import { exigirAccess, type Env, type Variaveis } from './acesso'

// Painel de gestao da Eme Praia. Inteiro atras do Cloudflare Access
// (decisao 11 e 13): todo pedido passa por exigirAccess antes de qualquer
// rota. As rotas entram nas proximas tasks.

export type { Env, Variaveis }

export const app = new Hono<{ Bindings: Env; Variables: Variaveis }>()

app.use('*', exigirAccess)

app.get('/', (c) => c.text(`Painel Eme Praia: em construcao. Logado como ${c.get('email')}.`))

export default app
```

- [ ] **Step 5: Rodar e ver passar**

Run (em `painel/`): `npm test && npm run typecheck`
Expected: 4 testes passando; typecheck limpo.

- [ ] **Step 6: Dev local sem Access**

Criar `painel/.dev.vars.example`:

```
# Copie pra .dev.vars (ignorado pelo git). So em dev local: o wrangler dev
# nao tem o Access na frente, entao o middleware precisa ser pulado.
SEM_ACCESS=1
```

Run (em `painel/`): `cp .dev.vars.example .dev.vars && git check-ignore .dev.vars`
Expected: imprime `.dev.vars`.

- [ ] **Step 7: Commit**

```bash
git add painel/
git status --short
git commit -m "feat(painel): middleware que exige identidade do Access e testes com D1 em memoria

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Conferir que `painel/.dev.vars` não aparece no status.

---

### Task 2: API de escrita — dois `PATCH` validados

**Files:**
- Create: `painel/src/api.ts`
- Create: `painel/src/api.test.ts`
- Modify: `painel/src/index.ts` (monta `api` em `/api`)
- Modify: `painel/package.json` (dependencies `zod`, `@hono/zod-validator`)

**Interfaces:**
- Consumes: `Env`, `Variaveis`, `app` (Task 1); tabelas `produtos`, `tamanhos`.
- Produces: `api: Hono` com `PATCH /produtos/:id/tamanhos/:tamanho` e `PATCH /produtos/:id`, montado em `/api`. O script da Task 3 chama essas URLs.

- [ ] **Step 1: Dependências**

Run (em `painel/`): `npm install zod@4.6.5 @hono/zod-validator@0.9.1`

- [ ] **Step 2: Testes (falhando)**

Criar `painel/src/api.test.ts`:

```ts
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { app } from './index'

const dev = { DB: env.DB, SEM_ACCESS: '1' }

function patch(caminho: string, corpo: unknown) {
  return app.request(
    caminho,
    { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) },
    dev,
  )
}

async function disponivelNoBanco(produto: string, tamanho: string) {
  const linha = await env.DB.prepare('SELECT disponivel FROM tamanhos WHERE produto_id = ? AND tamanho = ?')
    .bind(produto, tamanho)
    .first<{ disponivel: number }>()
  return linha?.disponivel
}

describe('PATCH /api/produtos/:id/tamanhos/:tamanho', () => {
  it('marca esgotado e devolve o estado gravado', async () => {
    const r = await patch('/api/produtos/top-tanga-sand/tamanhos/M', { disponivel: false })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ disponivel: false })
    expect(await disponivelNoBanco('top-tanga-sand', 'M')).toBe(0)
  })

  it('volta pra disponivel', async () => {
    await patch('/api/produtos/top-tanga-sand/tamanhos/M', { disponivel: false })
    const r = await patch('/api/produtos/top-tanga-sand/tamanhos/M', { disponivel: true })
    expect(r.status).toBe(200)
    expect(await disponivelNoBanco('top-tanga-sand', 'M')).toBe(1)
  })

  it('atualiza atualizado_em do produto', async () => {
    await env.DB.prepare(`UPDATE produtos SET atualizado_em = '2000-01-01 00:00:00' WHERE id = 'top-tanga-sand'`).run()
    await patch('/api/produtos/top-tanga-sand/tamanhos/M', { disponivel: false })
    const linha = await env.DB.prepare(`SELECT atualizado_em FROM produtos WHERE id = 'top-tanga-sand'`).first<{ atualizado_em: string }>()
    expect(linha?.atualizado_em).not.toBe('2000-01-01 00:00:00')
  })

  it('404 em tamanho que o produto nao tem', async () => {
    const r = await patch('/api/produtos/top-tanga-sand/tamanhos/XG', { disponivel: false })
    expect(r.status).toBe(404)
  })

  it('404 em produto inexistente', async () => {
    const r = await patch('/api/produtos/nao-existe/tamanhos/M', { disponivel: false })
    expect(r.status).toBe(404)
  })

  it('400 em corpo invalido', async () => {
    expect((await patch('/api/produtos/top-tanga-sand/tamanhos/M', { disponivel: 'sim' })).status).toBe(400)
    expect((await patch('/api/produtos/top-tanga-sand/tamanhos/M', {})).status).toBe(400)
  })

  it('sem Access responde 403 antes de tocar no banco', async () => {
    const r = await app.request(
      '/api/produtos/top-tanga-sand/tamanhos/M',
      { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ disponivel: false }) },
      { DB: env.DB },
    )
    expect(r.status).toBe(403)
    expect(await disponivelNoBanco('top-tanga-sand', 'M')).toBe(1)
  })
})

describe('PATCH /api/produtos/:id', () => {
  it('liga e desliga temKids', async () => {
    const r = await patch('/api/produtos/top-tanga-sand', { temKids: false })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ temKids: false })
    const linha = await env.DB.prepare(`SELECT tem_kids FROM produtos WHERE id = 'top-tanga-sand'`).first<{ tem_kids: number }>()
    expect(linha?.tem_kids).toBe(0)
  })

  it('404 em produto inexistente', async () => {
    expect((await patch('/api/produtos/nao-existe', { temKids: true })).status).toBe(404)
  })

  it('400 em corpo invalido', async () => {
    expect((await patch('/api/produtos/top-tanga-sand', { temKids: 1 })).status).toBe(400)
  })
})
```

Run (em `painel/`): `npm test`
Expected: os testes novos falham com 404 (rotas não existem). Os da Task 1 seguem passando.

- [ ] **Step 3: As rotas**

Criar `painel/src/api.ts`:

```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env, Variaveis } from './acesso'

// API de escrita do painel. Duas rotas, uma coluna cada. Disponibilidade e
// booleano, nunca quantidade (decisao 2). Nada aqui apaga: arquivar e Fase 3.

export const api = new Hono<{ Bindings: Env; Variables: Variaveis }>()

const CorpoDisponivel = z.object({ disponivel: z.boolean() })
const CorpoKids = z.object({ temKids: z.boolean() })

const SQL_TOCAR_PRODUTO = `UPDATE produtos SET atualizado_em = datetime('now') WHERE id = ?`

api.patch('/produtos/:id/tamanhos/:tamanho', zValidator('json', CorpoDisponivel), async (c) => {
  const { id, tamanho } = c.req.param()
  const { disponivel } = c.req.valid('json')

  const [resultado] = await c.env.DB.batch([
    c.env.DB.prepare('UPDATE tamanhos SET disponivel = ? WHERE produto_id = ? AND tamanho = ?').bind(
      disponivel ? 1 : 0,
      id,
      tamanho,
    ),
    c.env.DB.prepare(SQL_TOCAR_PRODUTO).bind(id),
  ])

  if (resultado.meta.changes === 0) return c.json({ erro: 'tamanho nao encontrado' }, 404)
  return c.json({ disponivel })
})

api.patch('/produtos/:id', zValidator('json', CorpoKids), async (c) => {
  const { id } = c.req.param()
  const { temKids } = c.req.valid('json')

  const resultado = await c.env.DB.prepare(
    `UPDATE produtos SET tem_kids = ?, atualizado_em = datetime('now') WHERE id = ?`,
  )
    .bind(temKids ? 1 : 0, id)
    .run()

  if (resultado.meta.changes === 0) return c.json({ erro: 'produto nao encontrado' }, 404)
  return c.json({ temKids })
})
```

Em `painel/src/index.ts`, adicionar o import e a montagem (a rota `GET /` continua):

```ts
import { api } from './api'
```

e, depois de `app.use('*', exigirAccess)`:

```ts
app.route('/api', api)
```

- [ ] **Step 4: Rodar e ver passar**

Run (em `painel/`): `npm test && npm run typecheck`
Expected: 14 testes passando (4 da Task 1 + 10 novos); typecheck limpo.

- [ ] **Step 5: Commit**

```bash
git add painel/
git commit -m "feat(painel): PATCH de disponibilidade por tamanho e de temKids, validados com Zod

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: A tela e o script do toque

**Files:**
- Create: `painel/src/tela.tsx`
- Create: `painel/src/tela.test.tsx`
- Create: `painel/public/painel.js`
- Modify: `painel/src/index.ts` (`GET /` passa a devolver a tela)
- Modify: `painel/wrangler.jsonc` (assets em `public/`)

**Interfaces:**
- Consumes: `lerCatalogo(db)` de `loja/worker/consultas.ts` (Fase 1) por caminho relativo `../../loja/worker/consultas`; rotas da Task 2.
- Produces: `GET /` com HTML. Cada botão de tamanho é `<button class="tamanho" data-produto="<id>" data-tamanho="<tamanho>" aria-pressed="true|false">`; cada chave kids é `<input type="checkbox" data-kids="<id>">`; o aviso é `<div id="aviso" hidden>`.

- [ ] **Step 1: Teste da tela (falhando)**

Criar `painel/src/tela.test.tsx`:

```ts
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { app } from './index'

const dev = { DB: env.DB, SEM_ACCESS: '1' }

describe('GET /', () => {
  it('lista os produtos agrupados por categoria com os botoes de tamanho', async () => {
    const r = await app.request('/', {}, dev)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toContain('text/html')

    const html = await r.text()
    expect(html).toContain('<h2>Biquínis</h2>')
    expect(html).toContain('<h2>Maiô</h2>')
    expect(html).toContain('Top Meia Taça + Tanga Lateral Sand')
    expect(html).toContain('data-produto="top-tanga-sand" data-tamanho="M" aria-pressed="true"')
    expect(html).toContain('data-kids="top-tanga-sand"')
    expect(html).toContain('Tem versão kids')
    expect(html).toContain('Não salvou. Tenta de novo.')
    expect(html).toContain('<script src="/painel.js"')
  })

  it('reflete o estado do banco', async () => {
    await env.DB.prepare(`UPDATE tamanhos SET disponivel = 0 WHERE produto_id = 'top-tanga-sand' AND tamanho = 'M'`).run()
    await env.DB.prepare(`UPDATE produtos SET tem_kids = 0 WHERE id = 'top-tanga-sand'`).run()
    const html = await (await app.request('/', {}, dev)).text()
    expect(html).toContain('data-produto="top-tanga-sand" data-tamanho="M" aria-pressed="false"')
    expect(html).toMatch(/data-kids="top-tanga-sand"(?![^>]*checked)/)
  })

  it('produto arquivado nao aparece', async () => {
    await env.DB.prepare(`UPDATE produtos SET ativo = 0 WHERE id = 'top-tanga-sand'`).run()
    const html = await (await app.request('/', {}, dev)).text()
    expect(html).not.toContain('Top Meia Taça + Tanga Lateral Sand')
  })

  it('escapa HTML no nome do produto', async () => {
    await env.DB.prepare(`UPDATE produtos SET nome = 'Top <b>x</b>' WHERE id = 'top-tanga-sand'`).run()
    const html = await (await app.request('/', {}, dev)).text()
    expect(html).toContain('Top &lt;b&gt;x&lt;/b&gt;')
  })
})
```

Run (em `painel/`): `npm test`
Expected: FAIL no primeiro teste (`GET /` devolve texto, não HTML).

- [ ] **Step 2: A tela**

Criar `painel/src/tela.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type { Categoria, Produto } from '../../loja/lib/tipos'

// A tela do painel. Uma pagina, celular primeiro, sem framework no
// navegador: o HTML sai pronto daqui e public/painel.js faz os toques.
// So o que a Mayara precisa: tamanhos adulto (toque alterna) e a chave kids.

const CSS = `
  :root { --laranja: #FB7F20; --terra: #B35207; --grafite: #323233; --breu: #1F1F20; --gelo: #FAFAFA; --concha: #E7E6E2; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--gelo); color: var(--grafite); font: 16px/1.4 system-ui, sans-serif; }
  header { padding: 20px 16px 8px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; font-size: 13px; color: var(--terra); }
  main { padding: 0 16px 80px; max-width: 640px; margin: 0 auto; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--terra); margin: 28px 0 8px; }
  article { background: #fff; border: 1px solid var(--concha); border-radius: 12px; padding: 14px 14px 12px; margin-bottom: 10px; }
  h3 { margin: 0 0 10px; font-size: 16px; font-weight: 500; }
  .tamanhos { display: flex; flex-wrap: wrap; gap: 8px; }
  .tamanho { min-width: 52px; min-height: 44px; padding: 0 12px; border-radius: 10px; font: inherit; font-weight: 600; cursor: pointer; border: 2px solid var(--grafite); }
  .tamanho[aria-pressed="true"] { background: var(--grafite); color: var(--gelo); }
  .tamanho[aria-pressed="false"] { background: transparent; color: var(--grafite); opacity: .45; text-decoration: line-through; }
  .tamanho:disabled { cursor: wait; }
  .kids { display: flex; align-items: center; gap: 10px; min-height: 44px; margin-top: 8px; font-size: 15px; }
  .kids input { width: 24px; height: 24px; accent-color: var(--laranja); }
  #aviso { position: fixed; left: 16px; right: 16px; bottom: 16px; background: var(--breu); color: var(--gelo); padding: 14px 16px; border-radius: 10px; text-align: center; }
`

type Props = { categorias: Categoria[]; produtos: Produto[]; email: string }

const Linha: FC<{ produto: Produto }> = ({ produto }) => (
  <article data-produto={produto.id}>
    <h3>{produto.nome}</h3>
    {produto.tamanhos.length > 0 && (
      <div class="tamanhos">
        {produto.tamanhos.map((t) => (
          <button
            type="button"
            class="tamanho"
            data-produto={produto.id}
            data-tamanho={t.tamanho}
            aria-pressed={t.disponivel ? 'true' : 'false'}
          >
            {t.tamanho}
          </button>
        ))}
      </div>
    )}
    <label class="kids">
      <input type="checkbox" data-kids={produto.id} checked={produto.temKids} />
      Tem versão kids
    </label>
  </article>
)

export const Tela: FC<Props> = ({ categorias, produtos, email }) => (
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Eme Praia — estoque</title>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </head>
    <body>
      <header>
        <h1>Estoque</h1>
        <p>{email}</p>
      </header>
      <main>
        {categorias.map((cat) => (
          <section>
            <h2>{cat.nome}</h2>
            {produtos
              .filter((p) => p.categoria === cat.slug)
              .map((p) => (
                <Linha produto={p} />
              ))}
          </section>
        ))}
      </main>
      <div id="aviso" hidden>
        Não salvou. Tenta de novo.
      </div>
      <script src="/painel.js" defer></script>
    </body>
  </html>
)
```

Em `painel/src/index.ts`, trocar a rota `GET /` por:

```ts
import { lerCatalogo } from '../../loja/worker/consultas'
import { Tela } from './tela'
```

```ts
app.get('/', async (c) => {
  const { categorias, produtos } = await lerCatalogo(c.env.DB)
  return c.html(<Tela categorias={categorias} produtos={produtos} email={c.get('email')} />)
})
```

Como `index.ts` passa a ter JSX, renomear o arquivo pra `painel/src/index.tsx` e atualizar `"main": "src/index.tsx"` em `painel/wrangler.jsonc`. Os imports `./index` nos testes continuam válidos.

- [ ] **Step 3: Rodar e ver passar**

Run (em `painel/`): `npm test && npm run typecheck`
Expected: 18 testes passando; typecheck limpo.

- [ ] **Step 4: O script do toque**

Criar `painel/public/painel.js`:

```js
// Os toques do painel. Otimista: muda na hora, manda o PATCH, desfaz se a
// API recusar. Enquanto a resposta nao volta, o controle fica travado
// contra toque duplo. Sem botao salvar, sem recarregar.

const aviso = document.getElementById('aviso')
let timerAviso

function avisar() {
  aviso.hidden = false
  clearTimeout(timerAviso)
  timerAviso = setTimeout(() => {
    aviso.hidden = true
  }, 4000)
}

async function patch(url, corpo) {
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  if (!r.ok) throw new Error(String(r.status))
}

function pintar(botao, disponivel) {
  botao.setAttribute('aria-pressed', disponivel ? 'true' : 'false')
}

document.addEventListener('click', async (ev) => {
  const botao = ev.target.closest('button.tamanho')
  if (!botao || botao.disabled) return
  const estava = botao.getAttribute('aria-pressed') === 'true'
  const { produto, tamanho } = botao.dataset

  pintar(botao, !estava)
  botao.disabled = true
  try {
    await patch(
      `/api/produtos/${encodeURIComponent(produto)}/tamanhos/${encodeURIComponent(tamanho)}`,
      { disponivel: !estava },
    )
  } catch {
    pintar(botao, estava)
    avisar()
  } finally {
    botao.disabled = false
  }
})

document.addEventListener('change', async (ev) => {
  const caixa = ev.target.closest('input[data-kids]')
  if (!caixa) return
  const novo = caixa.checked

  caixa.disabled = true
  try {
    await patch(`/api/produtos/${encodeURIComponent(caixa.dataset.kids)}`, { temKids: novo })
  } catch {
    caixa.checked = !novo
    avisar()
  } finally {
    caixa.disabled = false
  }
})
```

Em `painel/wrangler.jsonc`, adicionar depois de `"compatibility_date"`:

```jsonc
  // So o painel.js. E servido antes do Worker rodar, mas o Access cobre o
  // Worker inteiro, entao tambem fica atras do login.
  "assets": { "directory": "./public" },
```

- [ ] **Step 5: Olhar no navegador**

Run (em `painel/`):
```bash
npm run db:migrate:local
npm run dev
```
Expected: `http://localhost:8787/` abre a tela (com `SEM_ACCESS=1` do `.dev.vars`). Tocar no "M" do primeiro produto: fica riscado na hora. Recarregar: continua riscado. Desligar a chave kids: recarregar mantém desligada. Parar o `npm run dev`, tocar num botão: aparece "Não salvou. Tenta de novo." e o botão volta.

Se houver Playwright disponível na sessão, conferir também com viewport de celular (390 x 844): botões com pelo menos 44 px de altura.

- [ ] **Step 6: Commit**

```bash
git add painel/
git commit -m "feat(painel): tela de estoque em HTML do Hono e script do toque otimista

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `GET /api/disponibilidade.json` no Worker da loja

**Files:**
- Modify: `loja/lib/tipos.ts` (tipo `MapaDisponibilidade`)
- Modify: `loja/worker/consultas.ts` (`lerDisponibilidade`)
- Modify: `loja/worker/consultas.test.ts`
- Modify: `loja/worker/index.ts` (rota)
- Modify: `loja/worker/index.test.ts`

**Interfaces:**
- Consumes: tabelas do banco.
- Produces: `MapaDisponibilidade = Record<string, { temKids: boolean; tamanhos: Record<string, boolean> }>` em `lib/tipos.ts`; `lerDisponibilidade(db): Promise<MapaDisponibilidade>`; `GET /api/disponibilidade.json` com `Cache-Control: public, max-age=30, s-maxage=30`. Task 5 consome o tipo e a rota.

- [ ] **Step 1: O tipo**

Em `loja/lib/tipos.ts`, adicionar no fim:

```ts
/** O que muda varias vezes por dia e o site busca em runtime
 *  (GET /api/disponibilidade.json, decisao 3). Chave: slug do produto.
 *  So produtos ativos. Carrega temKids porque a chave da Mayara tambem
 *  precisa aparecer sem rebuild. */
export type MapaDisponibilidade = Record<
  string,
  {
    temKids: boolean
    tamanhos: Record<string, boolean>
  }
>
```

- [ ] **Step 2: Testes (falhando)**

Em `loja/worker/consultas.test.ts`, trocar o import por `import { lerCatalogo, lerDisponibilidade } from './consultas'` e adicionar no fim:

```ts
describe('lerDisponibilidade', () => {
  it('mapa por slug com tamanhos e temKids, so ativos', async () => {
    await env.DB.prepare(`UPDATE tamanhos SET disponivel = 0 WHERE produto_id = 'top-tanga-sand' AND tamanho = 'M'`).run()
    await env.DB.prepare(`UPDATE produtos SET tem_kids = 0 WHERE id = 'top-triangulo-oceano'`).run()
    await env.DB.prepare(`UPDATE produtos SET ativo = 0 WHERE id = 'top-cortininha-terracota'`).run()

    const mapa = await lerDisponibilidade(env.DB)

    expect(mapa['top-tanga-sand']).toEqual({ temKids: true, tamanhos: { P: true, M: false, G: true, GG: true } })
    expect(mapa['top-triangulo-oceano'].temKids).toBe(false)
    expect(mapa['top-cortininha-terracota']).toBeUndefined()
    expect(Object.keys(mapa)).toHaveLength(16)
  })
})
```

Em `loja/worker/index.test.ts`, adicionar:

```ts
describe('GET /api/disponibilidade.json', () => {
  it('devolve o mapa com 30 s de cache', async () => {
    const r = await exports.default.fetch('https://eme-praia.test/api/disponibilidade.json')
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('public, max-age=30, s-maxage=30')
    const mapa = (await r.json()) as Record<string, unknown>
    expect(Object.keys(mapa)).toHaveLength(17)
  })
})
```

Run (em `loja/`): `npm run test:worker`
Expected: FAIL (`lerDisponibilidade` não existe; rota devolve 404).

- [ ] **Step 3: Implementar**

Em `loja/worker/consultas.ts`, trocar a linha de import de tipos por:

```ts
import type { Categoria, MapaDisponibilidade, Produto, Tamanho } from '../lib/tipos'
```

e adicionar no fim:

```ts
// O que o site busca em runtime. Deriva de lerCatalogo pra que as duas
// leituras nunca discordem sobre o que e "ativo".
export async function lerDisponibilidade(db: D1Database): Promise<MapaDisponibilidade> {
  const { produtos } = await lerCatalogo(db)
  const mapa: MapaDisponibilidade = {}
  for (const p of produtos) {
    mapa[p.slug] = {
      temKids: p.temKids,
      tamanhos: Object.fromEntries(p.tamanhos.map((t) => [t.tamanho, t.disponivel])),
    }
  }
  return mapa
}
```

Em `loja/worker/index.ts`, trocar o import por `import { lerCatalogo, lerDisponibilidade } from './consultas'` e adicionar depois da rota do catálogo:

```ts
// Consumida pelo navegador em toda carga de pagina (DisponibilidadeProvider).
// 30 s de cache na borda e no navegador: e o "reflete em ate 30 s" da
// decisao 3, e o que impede um dia de praia de virar milhares de SELECTs.
app.get('/api/disponibilidade.json', async (c) => {
  const mapa = await lerDisponibilidade(c.env.DB)
  return c.json(mapa, 200, { 'Cache-Control': 'public, max-age=30, s-maxage=30' })
})
```

- [ ] **Step 4: Rodar e ver passar**

Run (em `loja/`): `npm run test:worker && npm run worker:typecheck`
Expected: 9 testes do Worker passando.

- [ ] **Step 5: Commit**

```bash
git add loja/lib/tipos.ts loja/worker/
git commit -m "feat(loja): GET /api/disponibilidade.json com temKids, 30 s de cache

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: O site reage — `aoVivo`, `DisponibilidadeProvider`, `useProdutoAoVivo`

**Files:**
- Create: `loja/lib/aoVivo.ts`
- Create: `loja/lib/aoVivo.test.ts`
- Create: `loja/components/DisponibilidadeProvider.tsx`
- Modify: `loja/app/layout.tsx`
- Modify: `loja/components/ProductCard.tsx`
- Modify: `loja/components/ProductDetail.tsx`

**Interfaces:**
- Consumes: `MapaDisponibilidade` (Task 4), `Produto`, `selecaoInicial` de `lib/variantes.ts`.
- Produces: `aoVivo(produto, mapa): Produto` (pura); `DisponibilidadeProvider` (cliente); `useProdutoAoVivo(produto): Produto`.

- [ ] **Step 1: Teste da mescla (falhando)**

Criar `loja/lib/aoVivo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { aoVivo } from '@/lib/aoVivo'
import type { Produto } from '@/lib/tipos'

const produto: Produto = {
  id: 'x',
  slug: 'x',
  nome: 'X',
  descricao: '',
  categoria: 'biquinis',
  precoCentavos: 10000,
  precoPixCentavos: 9000,
  imagens: [],
  tamanhos: [
    { tamanho: 'P', disponivel: true },
    { tamanho: 'M', disponivel: true },
  ],
  temKids: true,
  ordem: 1,
  ativo: true,
}

describe('aoVivo', () => {
  it('sem entrada no mapa devolve o proprio produto', () => {
    expect(aoVivo(produto, {})).toBe(produto)
  })

  it('tamanho no mapa segue o mapa', () => {
    const vivo = aoVivo(produto, { x: { temKids: true, tamanhos: { M: false } } })
    expect(vivo.tamanhos).toEqual([
      { tamanho: 'P', disponivel: true },
      { tamanho: 'M', disponivel: false },
    ])
  })

  it('tamanho fora do mapa mantem o valor do build', () => {
    const vivo = aoVivo({ ...produto, tamanhos: [{ tamanho: 'G', disponivel: false }] }, { x: { temKids: true, tamanhos: {} } })
    expect(vivo.tamanhos).toEqual([{ tamanho: 'G', disponivel: false }])
  })

  it('tamanho que so existe no mapa e ignorado: a grade e do build', () => {
    const vivo = aoVivo(produto, { x: { temKids: true, tamanhos: { XG: true } } })
    expect(vivo.tamanhos.map((t) => t.tamanho)).toEqual(['P', 'M'])
  })

  it('temKids segue o mapa', () => {
    expect(aoVivo(produto, { x: { temKids: false, tamanhos: {} } }).temKids).toBe(false)
  })

  it('nao muda o produto original', () => {
    aoVivo(produto, { x: { temKids: false, tamanhos: { P: false } } })
    expect(produto.temKids).toBe(true)
    expect(produto.tamanhos[0].disponivel).toBe(true)
  })
})
```

Run (em `loja/`): `npm test -- lib/aoVivo.test.ts`
Expected: FAIL, `@/lib/aoVivo` não existe.

- [ ] **Step 2: A mescla**

Criar `loja/lib/aoVivo.ts`:

```ts
import type { MapaDisponibilidade, Produto } from '@/lib/tipos'

// Mescla o produto do build com o mapa de disponibilidade buscado no
// navegador. Regras:
//  - sem entrada no mapa: vale o build (fetch falhou, ou produto novo)
//  - a grade (quais tamanhos existem) e do build; o mapa so diz sim/nao
//  - temKids tambem vem do mapa, pra chave da Mayara aparecer sem rebuild
// Funcao pura: e o que os testes cobrem. O hook so chama isso.

export function aoVivo(produto: Produto, mapa: MapaDisponibilidade): Produto {
  const vivo = mapa[produto.slug]
  if (!vivo) return produto
  return {
    ...produto,
    temKids: vivo.temKids,
    tamanhos: produto.tamanhos.map((t) =>
      t.tamanho in vivo.tamanhos ? { ...t, disponivel: vivo.tamanhos[t.tamanho] } : t,
    ),
  }
}
```

Run: `npm test -- lib/aoVivo.test.ts`
Expected: 6 testes passando.

- [ ] **Step 3: O provider e o hook**

Criar `loja/components/DisponibilidadeProvider.tsx`:

```tsx
'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { aoVivo } from '@/lib/aoVivo'
import type { MapaDisponibilidade, Produto } from '@/lib/tipos'

// A decisao 3 no navegador. Busca /api/disponibilidade.json (mesmo host do
// Worker da loja) a cada troca de pagina e entrega, via useProdutoAoVivo,
// o produto com tamanhos e temKids corrigidos. Se o fetch falhar (ex.:
// `next dev` sem o Worker), o mapa fica vazio e vale o build. Nao e erro.

const Ctx = createContext<MapaDisponibilidade>({})

function ehMapa(v: unknown): v is MapaDisponibilidade {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export default function DisponibilidadeProvider({ children }: { children: React.ReactNode }) {
  const [mapa, setMapa] = useState<MapaDisponibilidade>({})
  const pathname = usePathname()

  useEffect(() => {
    const controle = new AbortController()
    fetch('/api/disponibilidade.json', { signal: controle.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => {
        if (ehMapa(corpo)) setMapa(corpo)
      })
      .catch(() => {})
    return () => controle.abort()
  }, [pathname])

  return <Ctx.Provider value={mapa}>{children}</Ctx.Provider>
}

export function useProdutoAoVivo(produto: Produto): Produto {
  const mapa = useContext(Ctx)
  return useMemo(() => aoVivo(produto, mapa), [produto, mapa])
}
```

Em `loja/app/layout.tsx`, importar e envolver o conteúdo do `CartProvider`:

```tsx
import DisponibilidadeProvider from '@/components/DisponibilidadeProvider'
```

```tsx
        <CartProvider>
          <DisponibilidadeProvider>
            <Header />
            {children}
            <Footer />
            <CartBar />
            <CartDrawer />
          </DisponibilidadeProvider>
        </CartProvider>
```

- [ ] **Step 4: Card e página do produto usam o produto ao vivo**

Em `loja/components/ProductCard.tsx`:

- Adicionar o import `import { useProdutoAoVivo } from '@/components/DisponibilidadeProvider'`.
- Trocar a assinatura `export default function ProductCard({ produto }: { produto: Produto }) {` por:

```tsx
export default function ProductCard({ produto: doBuild }: { produto: Produto }) {
  // Tamanhos e temKids corrigidos pelo /api/disponibilidade.json. Tudo
  // abaixo (botoes, selo Esgotado, fileira kids) le deste `produto`.
  const produto = useProdutoAoVivo(doBuild)
```

O resto do componente já lê de `produto`; não muda.

Em `loja/components/ProductDetail.tsx`:

- Trocar `import { useState } from 'react'` por `import { useEffect, useState } from 'react'`.
- Adicionar `import { useProdutoAoVivo } from '@/components/DisponibilidadeProvider'`.
- Trocar a assinatura por:

```tsx
export default function ProductDetail({ produto: doBuild }: { produto: Produto }) {
  const produto = useProdutoAoVivo(doBuild)
```

- Logo depois das linhas de `useState` e `useSacola()`, adicionar:

```tsx
  // O mapa chega depois do primeiro render. Se o tamanho ja selecionado
  // ficou esgotado, ou o kids selecionado deixou de existir, refaz a
  // selecao inicial em vez de deixar a cliente com um botao morto marcado.
  useEffect(() => {
    if (!tamanhoSelecionado) return
    const adulto = produto.tamanhos.find((t) => t.tamanho === tamanhoSelecionado)
    const kidsSumiu = tamanhoSelecionado.startsWith('Kids ') && !produto.temKids
    if ((adulto && !adulto.disponivel) || kidsSumiu) setTamanhoSelecionado(selecaoInicial(produto))
  }, [produto, tamanhoSelecionado])
```

- [ ] **Step 5: Testes, lint e build**

Run (em `loja/`):
```bash
npm test
npm run lint
npm run build
```
Expected: todos os testes passando; lint sem erro (em especial, sem aviso de dependência de hook faltando); build passa.

- [ ] **Step 6: Conferir no navegador**

Run (em `loja/`, dois terminais): `npm run worker:dev` e, com `API_URL=http://localhost:8787` no `.env.local`, `npm run dev`.

Em outro terminal, marcar M esgotado direto no banco local:
```bash
cd painel && npx wrangler d1 execute eme-praia --local --persist-to ../.wrangler-state --command "UPDATE tamanhos SET disponivel = 0 WHERE produto_id = 'top-tanga-sand' AND tamanho = 'M'"
```

Abrir `http://localhost:3000/produto/top-tanga-sand`. Expected: o botão M aparece riscado e desabilitado mesmo que o HTML do build o tenha como disponível (o `next dev` faz o fetch em `localhost:3000/api/...`, que não existe; então pra ver o overlay em dev, apontar temporariamente o fetch pra `http://localhost:8787` ou testar direto no deploy da Task 6). Se o teste em dev não for prático, deixar pra verificação da Task 6 e registrar isso no relatório da task.

Voltar o banco local: mesmo comando com `disponivel = 1`.

- [ ] **Step 7: Commit**

```bash
git add loja/
git commit -m "feat(loja): disponibilidade e temKids ao vivo no card e na pagina do produto

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Deploy dos dois Workers, Access ligado, verificação de ponta a ponta e docs

**Files:**
- Modify: `README.md`
- Modify: `docs/runbook-caue.md`
- Modify: `docs/stack.md`
- Modify: `docs/decisoes.md`

- [ ] **Step 1: Deploy**

Run (em `loja/`): `npm run deploy`
Run (em `painel/`): `npm run deploy`
Expected: `https://eme-praia.pedidos-jp.workers.dev` e `https://eme-praia-painel.pedidos-jp.workers.dev`.

Run: `curl -s -w "\n%{http_code}\n" https://eme-praia-painel.pedidos-jp.workers.dev/`
Expected: `Painel sem Cloudflare Access na frente...` e `403`. O painel está fechado até o Access entrar.

Run: `curl -s https://eme-praia.pedidos-jp.workers.dev/api/disponibilidade.json | head -c 200`
Expected: JSON começando em `{"top-tanga-sand":{"temKids":true,"tamanhos":{"P":true`.

- [ ] **Step 2: Access no painel (Cauê, dashboard)**

Igual à Task 0, agora no Worker `eme-praia-painel`: Workers & Pages → `eme-praia-painel` → Access → Protect → All traffic → Apply. Depois, em Zero Trust → Access → Applications → `eme-praia-painel` → Policies: Allow, Emails: o do Cauê e o da Mayara.

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://eme-praia-painel.pedidos-jp.workers.dev/`
Expected: `302` (redireciona pro login do Access), não mais 403.

- [ ] **Step 3: Ponta a ponta no celular**

1. Cauê, no celular: abrir o painel, logar com o código. A tela lista os 17 produtos em duas categorias.
2. Tocar em "M" do primeiro produto: fica riscado na hora.
3. Abrir `https://eme-praia.pedidos-jp.workers.dev/produto/top-tanga-sand` em até 30 s: M riscado e desabilitado. Na home, o card do produto também.
4. Desligar "Tem versão kids" do mesmo produto. Recarregar a página do produto em até 30 s: a fileira "Linha kids" sumiu.
5. Reverter os dois toques. Conferir que voltaram no site.
6. Mayara, no celular dela, com o e-mail dela: repete 1 e 2. Anotar o que ela estranhou.

- [ ] **Step 4: README**

Na tabela **Fases**, marcar a Fase 2 como concluída. Na seção **Rodando**, adicionar no bloco de `painel/`:

```bash
cp .dev.vars.example .dev.vars   # SEM_ACCESS=1: pula o login em dev local
npm run dev                      # localhost:8787, a tela do painel
npm run deploy
```

No **Mapa das pastas**, a linha de `painel/` vira:

```
| `painel/` | O painel de gestão e a API de escrita. Cloudflare Worker + D1, inteiro atrás do Cloudflare Access. Dono das migrations |
```

- [ ] **Step 5: Runbook**

Em `docs/runbook-caue.md`, substituir a seção **Estado atual** por:

```markdown
## Estado atual

**Fase 2 concluída.** A Mayara marca tamanho esgotado e liga/desliga kids em
`https://eme-praia-painel.pedidos-jp.workers.dev`, logando com código no
e-mail. A loja reflete em até 30 s via `/api/disponibilidade.json`.

Próximo: Fase 3 (cadastro de produto, foto). Antes dela: habilitar R2 no
dashboard (pede cartão) e decidir Workers Builds + deploy hook.
```

Na seção **Os dois Workers e o banco**, trocar a linha do painel por:

```
| Painel | `painel/` | `eme-praia-painel` | tela de estoque, `PATCH /api/...`, dono das migrations. **Inteiro atrás do Access** |
```

Adicionar a seção:

```markdown
## Access (login do painel)

Está ligado no Worker `eme-praia-painel`: Workers & Pages → o Worker → aba
Access. A lista de e-mails que podem entrar fica em Zero Trust → Access →
Applications → `eme-praia-painel` → Policies. Pra dar acesso a alguém, é
só adicionar o e-mail lá. Não existe senha; o código vai por e-mail.

**Se o painel responder 403 com "Painel sem Cloudflare Access"**, alguém
desligou a proteção no dashboard. É o comportamento certo: o middleware
fecha em vez de abrir. Religar o Access resolve.

**Se responder 200 sem pedir login**, a variável `SEM_ACCESS` vazou pra
produção. Remover em Workers & Pages → `eme-praia-painel` → Settings →
Variables e fazer deploy de novo. Ela só pode existir em `painel/.dev.vars`.
```

Na seção **Verificações que valem repetir**, adicionar depois do comando da loja:

```bash
cd painel && npm test
```

e na lista, o item:

```markdown
- Toque no painel aparece no site em até 30 s sem rebuild (o HTML do build
  pode dizer "disponível"; o navegador corrige)
```

- [ ] **Step 6: Stack**

Em `docs/stack.md`, na tabela **Cloudflare**, trocar a linha do Access por:

```
| **Cloudflare Access** | — | Login do painel por código no e-mail. Ligado por Worker ("Protect this Worker behind Access"), sem domínio próprio. O Worker lê quem logou em `ctx.access.getIdentity()`. Nenhuma linha de autenticação escrita à mão. |
```

e adicionar:

```
| **@hono/zod-validator** | 0.9.1 | Valida o corpo dos `PATCH` do painel com Zod antes da rota rodar. Corpo errado vira 400 sem tocar no banco. |
```

- [ ] **Step 7: Decisões**

Em `docs/decisoes.md`, na decisão 3, adicionar depois da tabela:

```markdown
**Implementado na Fase 2.** `GET /api/disponibilidade.json` (30 s de cache)
carrega `disponivel` por tamanho **e** `temKids`, porque a chave kids da
Mayara também precisa aparecer sem rebuild. No site,
`components/DisponibilidadeProvider.tsx` busca isso a cada troca de página e
`useProdutoAoVivo` corrige o produto do build. O JSON-LD continua sendo o
estado do build (`lib/jsonld.tsx`).
```

- [ ] **Step 8: Commit**

```bash
git add README.md docs/
git commit -m "docs: Fase 2 concluida — Access no painel, overlay de disponibilidade, runbook

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Verificação final da Fase 2 (controller, antes de mesclar em `main`)

1. `cd loja && npm test && npm run test:worker && npm run build` e `cd painel && npm test` passam.
2. Painel sem login redireciona pro Access; e-mail fora da política é recusado; Mayara entrou do celular dela.
3. Toque num tamanho muda na hora, recarregar mantém, a loja mostra riscado em até 30 s. Chave kids desligada some com a fileira "Linha kids" em até 30 s.
4. Com o Access desligado no dashboard (testar e religar), o painel responde 403.
5. `painel/.dev.vars` não está no git; `SEM_ACCESS` não existe nas variáveis do Worker em produção.
6. `git log --format=%ae` da branch só tem `cauefranco01@gmail.com`; nenhum commit contém emoji.
