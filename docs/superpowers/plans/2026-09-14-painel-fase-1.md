# Painel — Fase 1 (D1 + API de leitura + build a partir do banco) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O catálogo sai de `loja/data/*.ts` e passa a morar num banco D1; o site continua estático, mas o build busca o catálogo numa API servida por um Worker que também serve o próprio site.

**Architecture:** Dois Workers na conta Cloudflare do Cauê e um banco D1 `eme-praia`. Nesta fase nasce o Worker `eme-praia` (em `loja/`): serve `loja/out` como assets e expõe `GET /api/catalogo.json` via Hono, só leitura. A pasta `painel/` nasce como dona do schema (migrations + seed), com um Worker mínimo que só ganha rotas na Fase 2. `lib/catalogo.ts` troca o import de arquivo por `fetch` + Zod, sem mudar assinatura, e `loja/data/` é apagada.

**Tech Stack:** Next.js 14.2.35 (`output: 'export'`), React 18, TypeScript 5 strict, Tailwind 3.4. Novo: Cloudflare Workers + D1 (wrangler 4.131), Hono 4.13, Zod 4.6, `@cloudflare/vitest-plugin` 1.1 (exige Vitest 4.1; a loja sobe de Vitest 3 pra 4), `tsx` só pra gerar o seed (e sai no fim).

Spec: `docs/superpowers/specs/2026-09-14-painel-fases-1-2-design.md`

## Global Constraints

- Todo comando roda na pasta indicada em cada step (`loja/` ou `painel/`). Os `git` rodam na raiz do repo `eme-praia`. Os comandos são pra Git Bash (é o que o Bash tool usa); `VAR=x comando` é sintaxe de bash.
- Commits saem da conta `cauefranco01@gmail.com` (já é a config local; conferir com `git config user.email`). Toda mensagem de commit termina com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Nada do MazyOS entra neste repo.** `git rev-parse --show-toplevel` tem que devolver `.../clientes/eme-praia`.
- Branch de trabalho: `painel-fase-1`, a partir de `main`.
- Nomes fixos: banco D1 `eme-praia`; Worker da loja `eme-praia`; Worker do painel `eme-praia-painel`; binding do banco `DB`; binding dos assets `ASSETS`.
- Estado local do wrangler compartilhado entre as duas pastas: sempre `--persist-to ../.wrangler-state` (relativo a `loja/` ou `painel/`). Essa pasta é ignorada pelo git.
- Booleanos no banco são `INTEGER` 0/1. Preços são inteiros em centavos. `imagens` é JSON (`string[]`) em coluna `TEXT`.
- A API devolve **exatamente** o formato de `loja/lib/tipos.ts`. `tipos.ts` não muda nesta fase.
- O build **falha** se a API não responder, responder não-200, vier malformada, ou tiver zero produtos válidos. Produto inválido isolado é pulado com `console.warn`.
- Versões fixas ao instalar: `hono@4.13.7`, `zod@4.6.5`, `wrangler@4.131.2`, `@cloudflare/vitest-plugin@1.1.9`, `vitest@4` (a última 4.x que o plugin aceitar), `tsx@4.23.13`.
- Não rodar `npm run build` com `npm run dev` aberto (os dois escrevem em `.next`).
- Sem emojis em código, docs ou commits. Comentários e mensagens em português, sem acento nos comentários de código (padrão já usado no repo).

---

### Task 0: Branch e pasta de estado

**Files:**
- Modify: `.gitignore` (raiz do repo)

- [ ] **Step 1: Conferir onde está e criar a branch**

Run (raiz do repo):
```bash
git rev-parse --show-toplevel && git config user.email && git status --short
git checkout -b painel-fase-1
```
Expected: toplevel termina em `clientes/eme-praia`; e-mail `cauefranco01@gmail.com`; status vazio.

- [ ] **Step 2: Ignorar o estado local compartilhado do wrangler**

Em `.gitignore` (raiz), abaixo de `.wrangler/`, adicionar:

```
.wrangler-state/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: ignora estado local compartilhado do wrangler

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 1: `painel/` nasce como dona do schema — migration 0001 e banco D1

**Files:**
- Create: `painel/package.json`
- Create: `painel/tsconfig.json`
- Create: `painel/wrangler.jsonc`
- Create: `painel/src/index.ts`
- Create: `painel/migrations/0001_catalogo.sql`
- Create: `painel/.gitignore`

**Interfaces:**
- Produces: banco D1 `eme-praia` (remoto, criado uma vez) com `database_id` gravado em `painel/wrangler.jsonc`; tabelas `categorias`, `produtos`, `tamanhos` com as colunas abaixo. Task 3 copia o mesmo `database_id` pra `loja/wrangler.jsonc`.

- [ ] **Step 1: Pacote do painel**

Criar `painel/package.json`:

```json
{
  "name": "eme-praia-painel",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev --persist-to ../.wrangler-state",
    "deploy": "wrangler deploy",
    "db:migrate:local": "wrangler d1 migrations apply eme-praia --local --persist-to ../.wrangler-state",
    "db:migrate:remote": "wrangler d1 migrations apply eme-praia --remote",
    "typecheck": "tsc --noEmit"
  }
}
```

Run (em `painel/`):
```bash
npm install hono@4.13.7
npm install --save-dev wrangler@4.131.2 typescript@5 @cloudflare/workers-types
```
Expected: `package.json` ganha `dependencies.hono` e as três devDependencies. `package-lock.json` criado.

- [ ] **Step 2: tsconfig do painel**

Criar `painel/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["esnext"],
    "types": ["@cloudflare/workers-types"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 3: Criar o banco D1 na conta (uma vez só)**

Run (em `painel/`):
```bash
npx wrangler d1 list
```
Expected: lista vazia (conferido em 2026-09-14). Se já existir um `eme-praia`, **não** criar outro: pegar o `database_id` da lista e pular pro Step 4.

Run:
```bash
npx wrangler d1 create eme-praia
```
Expected: saída com um bloco `d1_databases` contendo `database_id = "xxxxxxxx-xxxx-..."`. Copiar esse id.

- [ ] **Step 4: wrangler.jsonc do painel**

Criar `painel/wrangler.jsonc`, colando o id do Step 3 em `database_id`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "eme-praia-painel",
  "main": "src/index.ts",
  "compatibility_date": "2026-09-01",
  // O painel e dono do schema: migrations e seed moram aqui. O Worker da
  // loja (loja/wrangler.jsonc) aponta pro MESMO database_id e so le.
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "eme-praia",
      "database_id": "COLE-AQUI-O-ID-DO-STEP-3",
      "migrations_dir": "migrations"
    }
  ]
}
```

- [ ] **Step 5: Worker mínimo (as rotas chegam na Fase 2)**

Criar `painel/src/index.ts`:

```ts
import { Hono } from 'hono'

// Painel de gestao. Nesta fase o Worker so existe pra que `wrangler` tenha
// um `main` e as migrations possam ser aplicadas. As rotas (tela de estoque,
// API de escrita, middleware do Access) entram na Fase 2.

export type Env = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => c.text('Painel Eme Praia: em construcao (Fase 2).'))

export default app
```

Criar `painel/.gitignore`:

```
node_modules/
.wrangler/
.dev.vars
```

- [ ] **Step 6: Migration 0001**

Criar `painel/migrations/0001_catalogo.sql`:

```sql
-- Catalogo da Eme Praia. Espelha loja/lib/tipos.ts.
-- Booleanos sao INTEGER 0/1 (SQLite nao tem boolean). Precos em centavos.

CREATE TABLE categorias (
  id     TEXT PRIMARY KEY,
  slug   TEXT NOT NULL UNIQUE,
  nome   TEXT NOT NULL,
  imagem TEXT NOT NULL DEFAULT '',
  ordem  INTEGER NOT NULL,
  ativo  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE produtos (
  id                 TEXT PRIMARY KEY,
  -- Congelado na criacao (decisao 5). Nunca segue o nome.
  slug               TEXT NOT NULL UNIQUE,
  nome               TEXT NOT NULL,
  descricao          TEXT NOT NULL DEFAULT '',
  categoria_id       TEXT NOT NULL REFERENCES categorias(id),
  preco_centavos     INTEGER NOT NULL,
  preco_pix_centavos INTEGER NOT NULL,
  -- JSON: string[]. A Fase 3 grava a lista inteira de uma vez.
  imagens            TEXT NOT NULL DEFAULT '[]',
  tem_kids           INTEGER NOT NULL DEFAULT 0,
  ordem              INTEGER NOT NULL,
  -- Nada e excluido, tudo e arquivado (decisao 6).
  ativo              INTEGER NOT NULL DEFAULT 1,
  atualizado_em      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Grade adulto, por produto (decisao 8). Uma linha por tamanho: o toque da
-- Mayara no painel e um UPDATE de uma linha, sem reescrever o produto.
-- Kids nao entra aqui: e variante fixa da loja e nunca esgota.
CREATE TABLE tamanhos (
  produto_id TEXT NOT NULL REFERENCES produtos(id),
  tamanho    TEXT NOT NULL,
  ordem      INTEGER NOT NULL,
  disponivel INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (produto_id, tamanho)
);
```

- [ ] **Step 7: Aplicar localmente e conferir as tabelas**

Run (em `painel/`):
```bash
npm run db:migrate:local
npx wrangler d1 execute eme-praia --local --persist-to ../.wrangler-state --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```
Expected: a primeira aplica `0001_catalogo.sql`; a segunda lista `categorias`, `d1_migrations`, `produtos` e `tamanhos` (pode aparecer alguma tabela interna do D1 com prefixo `_cf_`; ignorar).

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add painel/ .gitignore
git commit -m "feat(painel): pasta do painel com schema do catalogo (migration 0001) e banco D1

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Seed a partir de `loja/data/*.ts`, aplicado local e remoto

**Files:**
- Create: `painel/scripts/gerar-seed.ts` (apagado na Task 5, junto com `loja/data/`)
- Create: `painel/migrations/0002_seed.sql` (gerado; fica versionado)
- Modify: `painel/package.json` (devDependency `tsx`, script `seed:gerar`)

**Interfaces:**
- Consumes: `loja/data/produtos.ts` (`produtos: Produto[]`), `loja/data/categorias.ts` (`categorias: Categoria[]`), tabelas da Task 1.
- Produces: banco local e remoto com 2 categorias, 17 produtos, 68 tamanhos (17 produtos x grade P/M/G/GG).

- [ ] **Step 1: Instalar o tsx e o script**

Run (em `painel/`): `npm install --save-dev tsx@4.23.13`

Em `painel/package.json`, dentro de `"scripts"`, adicionar:

```json
    "seed:gerar": "tsx scripts/gerar-seed.ts"
```

- [ ] **Step 2: O gerador**

Criar `painel/scripts/gerar-seed.ts`:

```ts
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { categorias } from '../../loja/data/categorias'
import { produtos } from '../../loja/data/produtos'

// Gera migrations/0002_seed.sql a partir das fixtures da Fase 0. Roda UMA
// vez. Depois disso loja/data/ e este script sao apagados: o banco passa a
// ser a fonte, e o SQL gerado fica versionado como registro do que entrou.

const texto = (v: string) => `'${v.replace(/'/g, "''")}'`
const bit = (v: boolean) => (v ? 1 : 0)

const idDaCategoria = new Map(categorias.map((c) => [c.slug, c.id]))

const linhas: string[] = [
  `-- Seed gerado de loja/data/*.ts em ${new Date().toISOString().slice(0, 10)}.`,
  '-- Sao os 17 fixtures herdados da Fase 0; o catalogo real entra pelo painel.',
  '',
]

for (const c of categorias) {
  linhas.push(
    `INSERT INTO categorias (id, slug, nome, imagem, ordem, ativo) VALUES (` +
      `${texto(c.id)}, ${texto(c.slug)}, ${texto(c.nome)}, ${texto(c.imagem)}, ${c.ordem}, ${bit(c.ativo)});`,
  )
}

linhas.push('')

for (const p of produtos) {
  const categoriaId = idDaCategoria.get(p.categoria)
  if (!categoriaId) throw new Error(`Produto ${p.slug} aponta pra categoria inexistente: ${p.categoria}`)
  linhas.push(
    `INSERT INTO produtos (id, slug, nome, descricao, categoria_id, preco_centavos, preco_pix_centavos, imagens, tem_kids, ordem, ativo) VALUES (` +
      `${texto(p.id)}, ${texto(p.slug)}, ${texto(p.nome)}, ${texto(p.descricao)}, ${texto(categoriaId)}, ` +
      `${p.precoCentavos}, ${p.precoPixCentavos}, ${texto(JSON.stringify(p.imagens))}, ${bit(p.temKids)}, ${p.ordem}, ${bit(p.ativo)});`,
  )
  p.tamanhos.forEach((t, i) => {
    linhas.push(
      `INSERT INTO tamanhos (produto_id, tamanho, ordem, disponivel) VALUES (` +
        `${texto(p.id)}, ${texto(t.tamanho)}, ${i + 1}, ${bit(t.disponivel)});`,
    )
  })
}

const destino = join(import.meta.dirname, '..', 'migrations', '0002_seed.sql')
writeFileSync(destino, linhas.join('\n') + '\n')
console.log(`ok: ${categorias.length} categorias, ${produtos.length} produtos -> ${destino}`)
```

- [ ] **Step 3: Gerar e conferir o SQL**

Run (em `painel/`): `npm run seed:gerar`
Expected: `ok: 2 categorias, 17 produtos -> .../migrations/0002_seed.sql`.

Run:
```bash
grep -c "INSERT INTO categorias" migrations/0002_seed.sql
grep -c "INSERT INTO produtos" migrations/0002_seed.sql
grep -c "INSERT INTO tamanhos" migrations/0002_seed.sql
grep -n "Meia Taça" migrations/0002_seed.sql | head -1
```
Expected: `2`, `17`, `68`, e a linha do produto `top-tanga-sand` com o nome acentuado intacto e `'[]'` em imagens.

- [ ] **Step 4: Aplicar local e conferir**

Run (em `painel/`):
```bash
npm run db:migrate:local
npx wrangler d1 execute eme-praia --local --persist-to ../.wrangler-state --command "SELECT (SELECT COUNT(*) FROM categorias) AS categorias, (SELECT COUNT(*) FROM produtos) AS produtos, (SELECT COUNT(*) FROM tamanhos) AS tamanhos"
```
Expected: `0002_seed.sql` aplicada; contagem `2 | 17 | 68`.

- [ ] **Step 5: Aplicar no banco remoto**

Run (em `painel/`):
```bash
npm run db:migrate:remote
npx wrangler d1 execute eme-praia --remote --command "SELECT (SELECT COUNT(*) FROM categorias) AS categorias, (SELECT COUNT(*) FROM produtos) AS produtos, (SELECT COUNT(*) FROM tamanhos) AS tamanhos"
```
Expected: as duas migrations aplicadas no remoto (o comando pede confirmação; responder sim); contagem `2 | 17 | 68`.

- [ ] **Step 6: Commit**

```bash
git add painel/
git commit -m "feat(painel): seed do catalogo gerado das fixtures da Fase 0

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Worker da loja — assets + `GET /api/catalogo.json`, testado contra D1 em memória

**Files:**
- Create: `loja/wrangler.jsonc`
- Create: `loja/worker/index.ts`
- Create: `loja/worker/consultas.ts`
- Create: `loja/worker/consultas.test.ts`
- Create: `loja/worker/index.test.ts`
- Create: `loja/worker/apply-migrations.ts`
- Create: `loja/worker/env.d.ts`
- Create: `loja/worker/tsconfig.json`
- Create: `loja/vitest.worker.config.ts`
- Modify: `loja/tsconfig.json` (excluir `worker/` do check do Next)
- Modify: `loja/package.json` (deps, scripts)
- Modify: `loja/.gitignore` (`.wrangler/`)

**Interfaces:**
- Consumes: tabelas e dados da Task 1 e 2; `Categoria`, `Produto` de `loja/lib/tipos.ts`.
- Produces: `lerCatalogo(db: D1Database): Promise<{ categorias: Categoria[]; produtos: Produto[] }>` em `worker/consultas.ts`; `GET /api/catalogo.json` devolvendo esse objeto com `Cache-Control: no-store`; Worker `eme-praia` publicado em `https://eme-praia.pedidos-jp.workers.dev`.

- [ ] **Step 1: Dependências e Vitest 4**

Run (em `loja/`):
```bash
npm install hono@4.13.7
npm install --save-dev wrangler@4.131.2 @cloudflare/workers-types @cloudflare/vitest-plugin@1.1.9 vitest@4
npm test
```
Expected: `vitest` sobe pra 4.x; os testes existentes de `lib/` e `components/` continuam passando (Vitest 4 não muda `describe/it/expect`). Se algum quebrar por API removida do Vitest, corrigir o teste, não a versão.

Em `loja/package.json`, dentro de `"scripts"`, adicionar (mantendo os existentes):

```json
    "test:worker": "vitest run --config vitest.worker.config.ts",
    "worker:dev": "wrangler dev --persist-to ../.wrangler-state",
    "worker:typecheck": "tsc -p worker",
    "deploy": "npm run build && wrangler deploy"
```

Em `loja/.gitignore`, no fim, adicionar:

```
# wrangler
.wrangler/
```

- [ ] **Step 2: wrangler.jsonc da loja**

Criar `loja/wrangler.jsonc`, com o **mesmo** `database_id` de `painel/wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "eme-praia",
  "main": "worker/index.ts",
  "compatibility_date": "2026-09-01",
  // O site estatico gerado pelo `next build`. Pedido que bate num arquivo e
  // servido direto; o que nao bate (ex.: /api/*) cai no Worker.
  "assets": {
    "directory": "./out",
    "binding": "ASSETS",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  },
  // Mesmo banco do painel. Aqui so SELECT; migrations moram em painel/.
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "eme-praia",
      "database_id": "MESMO-ID-DE-painel/wrangler.jsonc"
    }
  ]
}
```

- [ ] **Step 3: TypeScript separado pro Worker**

O `tsconfig.json` da loja usa `lib: dom` e é checado pelo `next build`. O Worker usa tipos da Cloudflare, que conflitam com o DOM. Então o Worker tem o próprio tsconfig e sai do check do Next.

Em `loja/tsconfig.json`, trocar a linha `"exclude": ["node_modules"]` por:

```json
  "exclude": ["node_modules", "worker"]
```

Criar `loja/worker/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["esnext"],
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-plugin/types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true
  },
  "include": ["./**/*.ts", "../lib/tipos.ts"]
}
```

Criar `loja/worker/env.d.ts`:

```ts
// Bindings do Worker da loja, como declarados em loja/wrangler.jsonc.
// TEST_MIGRATIONS so existe nos testes (vitest.worker.config.ts).
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    ASSETS: Fetcher
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }
}
```

- [ ] **Step 4: Config do Vitest pro Worker (D1 em memória com as migrations)**

Criar `loja/vitest.worker.config.ts`:

```ts
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

// Testes do Worker (worker/*.test.ts) rodam dentro do workerd, com um D1 em
// memoria que recebe as migrations de painel/migrations (schema + seed).
// Os testes de lib/ continuam no vitest.config.ts, em Node.
const raiz = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(async () => {
  // wrangler.jsonc aponta assets pra ./out; o diretorio precisa existir
  // mesmo sem build, senao o plugin recusa a config.
  mkdirSync(path.join(raiz, 'out'), { recursive: true })

  const migrations = await readD1Migrations(path.join(raiz, '..', 'painel', 'migrations'))

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      }),
    ],
    test: {
      include: ['worker/**/*.test.ts'],
      setupFiles: ['./worker/apply-migrations.ts'],
    },
  }
})
```

Criar `loja/worker/apply-migrations.ts`:

```ts
import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

// Setup file: roda antes de cada arquivo de teste. applyD1Migrations so
// aplica o que ainda nao foi aplicado, entao e seguro rodar mais de uma vez.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
```

- [ ] **Step 5: Teste de `lerCatalogo` (falhando)**

Criar `loja/worker/consultas.test.ts`:

```ts
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { lerCatalogo } from './consultas'

describe('lerCatalogo', () => {
  it('devolve categorias e produtos ativos, ordenados, no formato de tipos.ts', async () => {
    const { categorias, produtos } = await lerCatalogo(env.DB)

    expect(categorias.map((c) => c.slug)).toEqual(['biquinis', 'maio'])
    expect(produtos).toHaveLength(17)

    const primeiro = produtos[0]
    expect(primeiro).toEqual({
      id: 'top-tanga-sand',
      slug: 'top-tanga-sand',
      nome: 'Top Meia Taça + Tanga Lateral Sand',
      descricao: '',
      categoria: 'biquinis',
      precoCentavos: 42800,
      precoPixCentavos: 23800,
      imagens: [],
      tamanhos: [
        { tamanho: 'P', disponivel: true },
        { tamanho: 'M', disponivel: true },
        { tamanho: 'G', disponivel: true },
        { tamanho: 'GG', disponivel: true },
      ],
      temKids: true,
      ordem: 1,
      ativo: true,
    })
  })

  it('booleanos saem como boolean, nao 0/1', async () => {
    await env.DB.prepare(`UPDATE tamanhos SET disponivel = 0 WHERE produto_id = 'top-tanga-sand' AND tamanho = 'M'`).run()
    await env.DB.prepare(`UPDATE produtos SET tem_kids = 0 WHERE id = 'top-tanga-sand'`).run()

    const { produtos } = await lerCatalogo(env.DB)
    const p = produtos.find((x) => x.slug === 'top-tanga-sand')!
    expect(p.temKids).toBe(false)
    expect(p.tamanhos.find((t) => t.tamanho === 'M')?.disponivel).toBe(false)
  })

  it('produto arquivado nao vem', async () => {
    await env.DB.prepare(`UPDATE produtos SET ativo = 0 WHERE id = 'top-tanga-sand'`).run()
    const { produtos } = await lerCatalogo(env.DB)
    expect(produtos).toHaveLength(16)
    expect(produtos.some((p) => p.slug === 'top-tanga-sand')).toBe(false)
  })

  it('produto de categoria arquivada nao vem', async () => {
    await env.DB.prepare(`UPDATE categorias SET ativo = 0 WHERE id = 'maio'`).run()
    const { categorias, produtos } = await lerCatalogo(env.DB)
    expect(categorias.map((c) => c.slug)).toEqual(['biquinis'])
    expect(produtos.every((p) => p.categoria === 'biquinis')).toBe(true)
  })

  it('imagens vem como lista', async () => {
    await env.DB.prepare(`UPDATE produtos SET imagens = '["/produtos/a.webp","/produtos/b.webp"]' WHERE id = 'top-tanga-sand'`).run()
    const { produtos } = await lerCatalogo(env.DB)
    expect(produtos[0].imagens).toEqual(['/produtos/a.webp', '/produtos/b.webp'])
  })
})
```

O plugin isola o armazenamento por teste: o `UPDATE` de um teste não vaza pro seguinte.

- [ ] **Step 6: Rodar e ver falhar**

Run (em `loja/`): `npm run test:worker`
Expected: FAIL, `Failed to resolve import "./consultas"`.

- [ ] **Step 7: Implementar `consultas.ts`**

Criar `loja/worker/consultas.ts`:

```ts
import type { Categoria, Produto, Tamanho } from '../lib/tipos'

// Leitura do catalogo no D1, no formato exato de lib/tipos.ts. E o unico
// lugar do Worker da loja que fala SQL. Nada aqui escreve.

type LinhaCategoria = {
  id: string
  slug: string
  nome: string
  imagem: string
  ordem: number
  ativo: number
}

type LinhaProduto = {
  id: string
  slug: string
  nome: string
  descricao: string
  categoria: string
  preco_centavos: number
  preco_pix_centavos: number
  imagens: string
  tem_kids: number
  ordem: number
  ativo: number
}

type LinhaTamanho = {
  produto_id: string
  tamanho: string
  disponivel: number
}

const SQL_CATEGORIAS = `
  SELECT id, slug, nome, imagem, ordem, ativo
  FROM categorias
  WHERE ativo = 1
  ORDER BY ordem`

// Produto ativo em categoria ativa. A categoria sai pelo slug, que e o que
// tipos.ts espera em Produto.categoria.
const SQL_PRODUTOS = `
  SELECT p.id, p.slug, p.nome, p.descricao, c.slug AS categoria,
         p.preco_centavos, p.preco_pix_centavos, p.imagens, p.tem_kids,
         p.ordem, p.ativo
  FROM produtos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE p.ativo = 1 AND c.ativo = 1
  ORDER BY p.ordem`

const SQL_TAMANHOS = `
  SELECT produto_id, tamanho, disponivel
  FROM tamanhos
  ORDER BY produto_id, ordem`

const bool = (v: number) => v === 1

export async function lerCatalogo(db: D1Database): Promise<{ categorias: Categoria[]; produtos: Produto[] }> {
  const [cats, prods, tams] = await db.batch([
    db.prepare(SQL_CATEGORIAS),
    db.prepare(SQL_PRODUTOS),
    db.prepare(SQL_TAMANHOS),
  ])

  const tamanhosPorProduto = new Map<string, Tamanho[]>()
  for (const t of tams.results as LinhaTamanho[]) {
    const lista = tamanhosPorProduto.get(t.produto_id) ?? []
    lista.push({ tamanho: t.tamanho, disponivel: bool(t.disponivel) })
    tamanhosPorProduto.set(t.produto_id, lista)
  }

  const categorias: Categoria[] = (cats.results as LinhaCategoria[]).map((c) => ({
    id: c.id,
    slug: c.slug,
    nome: c.nome,
    imagem: c.imagem,
    ordem: c.ordem,
    ativo: bool(c.ativo),
  }))

  const produtos: Produto[] = (prods.results as LinhaProduto[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    nome: p.nome,
    descricao: p.descricao,
    categoria: p.categoria,
    precoCentavos: p.preco_centavos,
    precoPixCentavos: p.preco_pix_centavos,
    imagens: JSON.parse(p.imagens) as string[],
    tamanhos: tamanhosPorProduto.get(p.id) ?? [],
    temKids: bool(p.tem_kids),
    ordem: p.ordem,
    ativo: bool(p.ativo),
  }))

  return { categorias, produtos }
}
```

- [ ] **Step 8: Rodar e ver passar**

Run (em `loja/`): `npm run test:worker`
Expected: 5 testes passando em `worker/consultas.test.ts`.

- [ ] **Step 9: Teste da rota (falhando)**

Criar `loja/worker/index.test.ts`:

```ts
import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

describe('GET /api/catalogo.json', () => {
  it('devolve o catalogo sem cache', async () => {
    const resposta = await exports.default.fetch('https://eme-praia.test/api/catalogo.json')
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get('content-type')).toContain('application/json')
    expect(resposta.headers.get('cache-control')).toBe('no-store')

    const corpo = (await resposta.json()) as { categorias: unknown[]; produtos: unknown[] }
    expect(corpo.categorias).toHaveLength(2)
    expect(corpo.produtos).toHaveLength(17)
  })

  it('caminho que nao e API nem asset devolve 404', async () => {
    const resposta = await exports.default.fetch('https://eme-praia.test/nao-existe')
    expect(resposta.status).toBe(404)
  })
})
```

Run: `npm run test:worker`
Expected: FAIL nos dois testes (o Worker ainda é o `main` inexistente; erro de resolução de `worker/index.ts`).

- [ ] **Step 10: O Worker**

Criar `loja/worker/index.ts`:

```ts
import { Hono } from 'hono'
import { lerCatalogo } from './consultas'

// Worker da loja: serve loja/out como assets (configurado em wrangler.jsonc,
// antes deste codigo rodar) e a API de LEITURA do catalogo. Nada aqui
// escreve no banco; a escrita e do Worker do painel.

type Env = {
  DB: D1Database
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Env }>()

// Consumida so pelo `next build`. Sem cache: o build precisa do estado
// atual, e ninguem mais chama isso em volume.
app.get('/api/catalogo.json', async (c) => {
  const catalogo = await lerCatalogo(c.env.DB)
  return c.json(catalogo, 200, { 'Cache-Control': 'no-store' })
})

app.onError((erro, c) => {
  console.error('catalogo: erro no banco', erro)
  return c.json({ erro: 'falha ao ler o catalogo' }, 500)
})

// Tudo que nao e API volta pros assets, que aplicam o not_found_handling
// (a 404.html do Next).
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw))

export default app
```

- [ ] **Step 11: Rodar tudo e checar tipos**

Run (em `loja/`):
```bash
npm run test:worker
npm run worker:typecheck
npm test
```
Expected: 7 testes do Worker passando; typecheck sem erro; testes de `lib/` passando.

- [ ] **Step 12: Build (ainda de arquivo) e primeiro deploy**

O `lib/catalogo.ts` ainda lê de `data/`, então o build funciona sem a API. É o que permite publicar o site junto com a API pela primeira vez.

Run (em `loja/`):
```bash
npm run build
npx wrangler deploy
```
Expected: `out/` gerado; deploy termina com `https://eme-praia.pedidos-jp.workers.dev`.

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://eme-praia.pedidos-jp.workers.dev/
curl -s -o /dev/null -w "%{http_code}\n" https://eme-praia.pedidos-jp.workers.dev/produto/top-tanga-sand
curl -s https://eme-praia.pedidos-jp.workers.dev/api/catalogo.json | head -c 300
curl -s -o /dev/null -w "%{http_code}\n" https://eme-praia.pedidos-jp.workers.dev/nao-existe
```
Expected: `200`, `200`, JSON começando em `{"categorias":[{"id":"biquinis"`, `404`.

- [ ] **Step 13: Commit**

```bash
git add loja/
git commit -m "feat(loja): Worker eme-praia serve o site e GET /api/catalogo.json sobre D1

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `lib/schema.ts` — validação Zod amarrada a `tipos.ts`

**Files:**
- Create: `loja/lib/schema.ts`
- Create: `loja/lib/schema.test.ts`
- Modify: `loja/package.json` (dependency `zod`)

**Interfaces:**
- Consumes: `Categoria`, `Produto` de `lib/tipos.ts`.
- Produces: `CategoriaSchema`, `ProdutoSchema` (cada um `satisfies z.ZodType<T>`), `CatalogoSchema` (envelope `{ categorias: unknown[]; produtos: unknown[] }`).

- [ ] **Step 1: Instalar o Zod**

Run (em `loja/`): `npm install zod@4.6.5`

- [ ] **Step 2: Teste (falhando)**

Criar `loja/lib/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CatalogoSchema, CategoriaSchema, ProdutoSchema } from '@/lib/schema'

const produtoValido = {
  id: 'top-tanga-sand',
  slug: 'top-tanga-sand',
  nome: 'Top Meia Taça + Tanga Lateral Sand',
  descricao: '',
  categoria: 'biquinis',
  precoCentavos: 42800,
  precoPixCentavos: 23800,
  imagens: [],
  tamanhos: [{ tamanho: 'P', disponivel: true }],
  temKids: true,
  ordem: 1,
  ativo: true,
}

describe('ProdutoSchema', () => {
  it('aceita um produto no formato de tipos.ts', () => {
    expect(ProdutoSchema.safeParse(produtoValido).success).toBe(true)
  })

  it('recusa preco em float', () => {
    expect(ProdutoSchema.safeParse({ ...produtoValido, precoCentavos: 149.9 }).success).toBe(false)
  })

  it('recusa slug vazio ou com caractere fora de [a-z0-9-]', () => {
    expect(ProdutoSchema.safeParse({ ...produtoValido, slug: '' }).success).toBe(false)
    expect(ProdutoSchema.safeParse({ ...produtoValido, slug: 'Top Sand' }).success).toBe(false)
  })

  it('recusa tamanho sem booleano de disponibilidade', () => {
    expect(ProdutoSchema.safeParse({ ...produtoValido, tamanhos: [{ tamanho: 'P', disponivel: 1 }] }).success).toBe(false)
  })

  it('recusa campo faltando', () => {
    const { temKids: _omitido, ...semKids } = produtoValido
    expect(ProdutoSchema.safeParse(semKids).success).toBe(false)
  })
})

describe('CategoriaSchema', () => {
  it('aceita e recusa', () => {
    expect(CategoriaSchema.safeParse({ id: 'maio', slug: 'maio', nome: 'Maiô', imagem: '', ordem: 2, ativo: true }).success).toBe(true)
    expect(CategoriaSchema.safeParse({ id: 'maio', slug: 'maio', nome: '', imagem: '', ordem: 2, ativo: true }).success).toBe(false)
  })
})

describe('CatalogoSchema', () => {
  it('so exige o envelope; os itens sao validados um a um depois', () => {
    expect(CatalogoSchema.safeParse({ categorias: [], produtos: [{ qualquer: 'coisa' }] }).success).toBe(true)
    expect(CatalogoSchema.safeParse({ produtos: [] }).success).toBe(false)
    expect(CatalogoSchema.safeParse('texto').success).toBe(false)
  })
})
```

Run (em `loja/`): `npm test -- lib/schema.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/schema"`.

- [ ] **Step 3: Implementar**

Criar `loja/lib/schema.ts`:

```ts
import { z } from 'zod'
import type { Categoria, Produto } from '@/lib/tipos'

// Validacao do que chega da API antes de virar pagina. Cada schema e
// amarrado ao tipo de tipos.ts com `satisfies`: se o tipo mudar e o schema
// nao acompanhar, o TypeScript recusa aqui, em vez de deixar passar dado
// errado pro build.
//
// So o build (Node) importa este arquivo. Nenhum componente cliente deve
// importar, pra nao mandar o Zod pro navegador.

const centavos = z.number().int().nonnegative()
const slug = z.string().min(1).regex(/^[a-z0-9-]+$/)
const naoVazio = z.string().min(1)

export const TamanhoSchema = z.object({
  tamanho: naoVazio,
  disponivel: z.boolean(),
})

export const ProdutoSchema = z.object({
  id: naoVazio,
  slug,
  nome: naoVazio,
  descricao: z.string(),
  categoria: slug,
  precoCentavos: centavos,
  precoPixCentavos: centavos,
  imagens: z.array(z.string()),
  tamanhos: z.array(TamanhoSchema),
  temKids: z.boolean(),
  ordem: z.number().int(),
  ativo: z.boolean(),
}) satisfies z.ZodType<Produto>

export const CategoriaSchema = z.object({
  id: naoVazio,
  slug,
  nome: naoVazio,
  imagem: z.string(),
  ordem: z.number().int(),
  ativo: z.boolean(),
}) satisfies z.ZodType<Categoria>

// O envelope. Os itens ficam `unknown` de proposito: cada um e validado
// separado em lib/catalogo.ts, pra que um produto invalido seja pulado
// sem derrubar o catalogo inteiro.
export const CatalogoSchema = z.object({
  categorias: z.array(z.unknown()),
  produtos: z.array(z.unknown()),
})
```

- [ ] **Step 4: Rodar e ver passar**

Run (em `loja/`): `npm test -- lib/schema.test.ts`
Expected: 8 testes passando.

- [ ] **Step 5: Commit**

```bash
git add loja/lib/schema.ts loja/lib/schema.test.ts loja/package.json loja/package-lock.json
git commit -m "feat(loja): schemas Zod do catalogo amarrados a tipos.ts

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: A troca em `lib/catalogo.ts` — `fetch` + Zod, e `loja/data/` some

**Files:**
- Modify: `loja/lib/catalogo.ts`
- Modify: `loja/lib/catalogo.test.ts`
- Create: `loja/.env.example`
- Create: `loja/.env.local` (ignorado pelo git)
- Delete: `loja/data/produtos.ts`, `loja/data/categorias.ts`
- Delete: `painel/scripts/gerar-seed.ts`
- Modify: `painel/package.json` (sai `tsx` e o script `seed:gerar`)

**Interfaces:**
- Consumes: `CatalogoSchema`, `CategoriaSchema`, `ProdutoSchema` (Task 4); `GET /api/catalogo.json` (Task 3).
- Produces: `carregarCatalogo(fetchImpl?, url?)` exportada pra teste; `getCategorias`, `getCategoria`, `getProdutos`, `getProduto`, `getProdutosPorCategoria`, `temEstoque` com as **mesmas assinaturas de hoje**.

- [ ] **Step 1: Testes da carga (falhando)**

Em `loja/lib/catalogo.test.ts`, manter o bloco `describe('temEstoque', ...)` como está e **adicionar** no topo do arquivo o import e, no fim, o bloco abaixo:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { carregarCatalogo, temEstoque } from '@/lib/catalogo'
import type { Produto } from '@/lib/tipos'
```

(substitui a linha de import atual do vitest e a de `temEstoque`.)

```ts
const categoriaValida = { id: 'biquinis', slug: 'biquinis', nome: 'Biquínis', imagem: '', ordem: 1, ativo: true }

function fetchQueResponde(status: number, corpo: unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch
}

describe('carregarCatalogo', () => {
  afterEach(() => vi.restoreAllMocks())

  it('exige API_URL', async () => {
    // '' e nao undefined: undefined cairia no default do parametro
    // (process.env.API_URL) e o teste dependeria do ambiente.
    await expect(carregarCatalogo(fetchQueResponde(200, {}), '')).rejects.toThrow(/API_URL/)
  })

  it('falha se a API nao responder 200', async () => {
    await expect(carregarCatalogo(fetchQueResponde(500, {}), 'http://api')).rejects.toThrow(/500/)
  })

  it('falha se o corpo nao for o envelope', async () => {
    await expect(carregarCatalogo(fetchQueResponde(200, { produtos: 'x' }), 'http://api')).rejects.toThrow()
  })

  it('falha com zero produtos validos', async () => {
    await expect(
      carregarCatalogo(fetchQueResponde(200, { categorias: [categoriaValida], produtos: [] }), 'http://api'),
    ).rejects.toThrow(/zero produtos/)
  })

  it('pula produto invalido com aviso e mantem os outros', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const corpo = {
      categorias: [categoriaValida],
      produtos: [
        { ...base, id: 'ok', slug: 'ok', ordem: 2 },
        { ...base, id: 'quebrado', slug: 'quebrado', precoCentavos: 149.9, ordem: 1 },
      ],
    }
    const { produtos } = await carregarCatalogo(fetchQueResponde(200, corpo), 'http://api')
    expect(produtos.map((p) => p.slug)).toEqual(['ok'])
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('quebrado'), expect.anything())
  })

  it('pula produto cuja categoria nao veio', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const corpo = {
      categorias: [categoriaValida],
      produtos: [{ ...base, id: 'orfao', slug: 'orfao', categoria: 'chapeus' }, { ...base, id: 'ok', slug: 'ok' }],
    }
    const { produtos } = await carregarCatalogo(fetchQueResponde(200, corpo), 'http://api')
    expect(produtos.map((p) => p.slug)).toEqual(['ok'])
  })

  it('filtra inativos e ordena por ordem', async () => {
    const corpo = {
      categorias: [categoriaValida, { ...categoriaValida, id: 'maio', slug: 'maio', ordem: 2, ativo: false }],
      produtos: [
        { ...base, id: 'b', slug: 'b', ordem: 2 },
        { ...base, id: 'a', slug: 'a', ordem: 1 },
        { ...base, id: 'c', slug: 'c', ordem: 3, ativo: false },
      ],
    }
    const { categorias, produtos } = await carregarCatalogo(fetchQueResponde(200, corpo), 'http://api')
    expect(categorias.map((c) => c.slug)).toEqual(['biquinis'])
    expect(produtos.map((p) => p.slug)).toEqual(['a', 'b'])
  })

  it('aceita API_URL com barra no fim', async () => {
    const f = fetchQueResponde(200, { categorias: [categoriaValida], produtos: [base] })
    await carregarCatalogo(f, 'http://api/')
    expect(f).toHaveBeenCalledWith('http://api/api/catalogo.json')
  })
})
```

`base` é o `Produto` que já existe no topo do arquivo de teste (tem `categoria: 'biquinis'`, `ativo: true`, `ordem: 1`).

Run (em `loja/`): `npm test -- lib/catalogo.test.ts`
Expected: FAIL, `carregarCatalogo` não é exportado.

- [ ] **Step 2: Reescrever `lib/catalogo.ts`**

Substituir o conteúdo inteiro de `loja/lib/catalogo.ts` por:

```ts
import type { z } from 'zod'
import { CatalogoSchema, CategoriaSchema, ProdutoSchema } from '@/lib/schema'
import type { Categoria, Produto } from '@/lib/tipos'

// A FRONTEIRA DO CATALOGO.
//
// Fase 0: os dados vinham de arquivo (data/*.ts).
// Fase 1 (agora): vem de GET /api/catalogo.json, servido pelo Worker da loja
// sobre o D1. So o build chama isso; o HTML sai pronto.
//
// Todo o site fala com o catalogo atraves destas funcoes. As assinaturas nao
// mudaram na troca: e pra isso que elas ja eram async na Fase 0.
//
// Regras de falha (docs/runbook-caue.md):
//  - API fora, nao-200, JSON malformado  -> build FALHA. O deploy anterior fica.
//  - zero produtos validos               -> build FALHA. Nunca publicar loja vazia.
//  - um produto invalido                 -> pulado com console.warn. O resto builda.

type Catalogo = { categorias: Categoria[]; produtos: Produto[] }

const ativos = <T extends { ativo: boolean; ordem: number }>(lista: T[]) =>
  lista.filter((i) => i.ativo).sort((a, b) => a.ordem - b.ordem)

function validos<T>(itens: unknown[], schema: z.ZodType<T>, rotulo: string): T[] {
  const ok: T[] = []
  for (const item of itens) {
    const r = schema.safeParse(item)
    if (r.success) {
      ok.push(r.data)
    } else {
      const slug = (item as { slug?: unknown })?.slug
      console.warn(`catalogo: ${rotulo} pulado (${String(slug ?? '?')})`, r.error.issues)
    }
  }
  return ok
}

/** Le a API uma vez. Exportada pra teste; o site usa as funcoes get*. */
export async function carregarCatalogo(
  fetchImpl: typeof fetch = fetch,
  url: string | undefined = process.env.API_URL,
): Promise<Catalogo> {
  if (!url) {
    throw new Error(
      'API_URL nao definida. Copie loja/.env.example pra loja/.env.local e aponte pro Worker eme-praia.',
    )
  }
  const resposta = await fetchImpl(`${url.replace(/\/$/, '')}/api/catalogo.json`)
  if (!resposta.ok) {
    throw new Error(`catalogo: a API respondeu ${resposta.status} em ${url}. Build abortado.`)
  }
  const bruto = CatalogoSchema.parse(await resposta.json())

  const categorias = validos(bruto.categorias, CategoriaSchema, 'categoria')
  const slugsDeCategoria = new Set(categorias.map((c) => c.slug))
  const produtos = validos(bruto.produtos, ProdutoSchema, 'produto').filter((p) => {
    if (slugsDeCategoria.has(p.categoria)) return true
    console.warn(`catalogo: produto pulado (${p.slug}): categoria "${p.categoria}" nao existe`)
    return false
  })

  if (produtos.length === 0) {
    throw new Error('catalogo: zero produtos validos. Build abortado pra nao publicar loja vazia.')
  }

  return { categorias: ativos(categorias), produtos: ativos(produtos) }
}

// Uma leitura por build. O Next chama getProdutos() dezenas de vezes
// (generateStaticParams, cada pagina, sitemap); a API e lida uma vez so.
let emMemoria: Promise<Catalogo> | undefined
const catalogo = () => (emMemoria ??= carregarCatalogo())

export async function getCategorias(): Promise<Categoria[]> {
  return (await catalogo()).categorias
}

export async function getCategoria(slug: string): Promise<Categoria | undefined> {
  return (await getCategorias()).find((c) => c.slug === slug)
}

export async function getProdutos(): Promise<Produto[]> {
  return (await catalogo()).produtos
}

export async function getProduto(slug: string): Promise<Produto | undefined> {
  return (await getProdutos()).find((p) => p.slug === slug)
}

export async function getProdutosPorCategoria(slug: string): Promise<Produto[]> {
  return (await getProdutos()).filter((p) => p.categoria === slug)
}

/** Um produto so esta a venda se tiver ao menos um tamanho disponivel.
 *  Produto sem grade (tamanhos vazio) esta sempre disponivel. Produto com
 *  kids tambem: kids e sob encomenda e nunca esgota. */
export function temEstoque(produto: Produto) {
  return (
    produto.temKids ||
    produto.tamanhos.length === 0 ||
    produto.tamanhos.some((t) => t.disponivel)
  )
}
```

- [ ] **Step 3: Rodar e ver passar**

Run (em `loja/`): `npm test`
Expected: todos passando, incluindo os 8 novos de `carregarCatalogo` e os antigos de `temEstoque`.

- [ ] **Step 4: Variável de build**

Criar `loja/.env.example`:

```
# URL do Worker eme-praia, sem barra no fim. O `next build` busca
# /api/catalogo.json aqui. Copie pra .env.local (ignorado pelo git).
# Producao:   https://eme-praia.pedidos-jp.workers.dev
# Local:      http://localhost:8787   (com `npm run worker:dev` rodando)
API_URL=https://eme-praia.pedidos-jp.workers.dev
```

Run (em `loja/`): `cp .env.example .env.local && git check-ignore .env.local`
Expected: imprime `.env.local` (está ignorado).

- [ ] **Step 5: Apagar `data/` e o gerador de seed**

Run (em `loja/`):
```bash
rm -r data
grep -rn "@/data" --include=*.ts --include=*.tsx . | grep -v node_modules
```
Expected: `grep` sem saída (nada mais importa de `data/`).

Run (em `painel/`):
```bash
rm -r scripts
npm uninstall tsx
```

Em `painel/package.json`, remover a linha do script `"seed:gerar"`.

- [ ] **Step 6: Build a partir do banco**

Run (em `loja/`):
```bash
npm run build
ls out/produto | head -3
grep -o "<title>[^<]*</title>" out/produto/top-tanga-sand.html
```
Expected: build passa; `out/produto/` tem 17 arquivos `.html`; o título do produto é próprio (não o da loja).

- [ ] **Step 7: Provar que o build falha certo**

Run (em `loja/`):
```bash
API_URL=http://127.0.0.1:9 npm run build; echo "exit=$?"
```
Expected: build falha (exit diferente de 0) com o erro de `fetch` na saída; **não** deixa um `out/` vazio no lugar do anterior.

Run:
```bash
API_URL= npm run build 2>&1 | grep -o "API_URL nao definida[^\"]*"
```
Expected: a mensagem `API_URL nao definida. Copie loja/.env.example ...`.

Depois, restaurar: `npm run build` (com o `.env.local` normal) volta a passar.

- [ ] **Step 8: Commit**

```bash
git add -A loja/ painel/
git status --short
git commit -m "feat(loja): catalogo vem da API com validacao Zod; loja/data/ sai do repo

O build le GET /api/catalogo.json uma vez, valida cada produto e falha
alto se a API cair ou vier vazia. O gerador de seed sai junto com as
fixtures que ele lia; migrations/0002_seed.sql fica como registro.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Conferir no `git status --short` antes do commit: `loja/.env.local` **não** pode aparecer.

---

### Task 6: Deploy do site buildado do banco e documentação

**Files:**
- Modify: `README.md`
- Modify: `docs/runbook-caue.md`
- Modify: `docs/stack.md`
- Modify: `docs/decisoes.md`

- [ ] **Step 1: Deploy**

Run (em `loja/`): `npm run deploy`
Expected: build a partir da API e `wrangler deploy` publicando em `https://eme-praia.pedidos-jp.workers.dev`.

Run:
```bash
curl -s https://eme-praia.pedidos-jp.workers.dev/produto/top-tanga-sand | grep -o "<title>[^<]*</title>"
curl -s https://eme-praia.pedidos-jp.workers.dev/sitemap.xml | grep -c "<loc>"
```
Expected: título do produto; 20 URLs no sitemap (home + 2 categorias + 17 produtos).

- [ ] **Step 2: README**

Em `README.md`:

Na seção **Rodando**, substituir o bloco de comandos por:

```bash
cd loja
npm install
cp .env.example .env.local   # API_URL: de onde o build busca o catalogo
npm run dev                  # localhost:3000 (le a API de producao)
npm run build                # gera os arquivos estaticos em loja/out/
npm run deploy               # build + wrangler deploy do Worker eme-praia

cd ../painel
npm install
npm run db:migrate:local     # D1 local em ../.wrangler-state (compartilhado com a loja)
npm run db:migrate:remote    # aplica migrations pendentes no D1 de producao
```

Na tabela **Mapa das pastas**, trocar a linha de `painel/` por:

```
| `painel/` | Dono do schema do banco (`migrations/`) e, a partir da Fase 2, o painel de gestão. Cloudflare Worker + D1 |
```

Na tabela de dentro de `loja/`, trocar a linha de `data/` por:

```
| `worker/` | O Worker `eme-praia`: serve `out/` e `GET /api/catalogo.json` sobre o D1 |
```

e adicionar a linha:

```
| `wrangler.jsonc` | Config do Worker: assets em `out/`, binding `DB` pro D1 `eme-praia` |
```

Na seção **Fronteiras do código**, trocar o item de `lib/catalogo.ts` por:

```
- `lib/catalogo.ts` — a fronteira dos dados. Faz `fetch` em `/api/catalogo.json`
  no build, valida com `lib/schema.ts` e falha o build se a API cair.
```

Na tabela **Fases**, marcar a Fase 1 como `✅ concluída` (mesmo símbolo que a Fase 0 já usa).

- [ ] **Step 3: Runbook**

Em `docs/runbook-caue.md`, substituir a seção **Estado atual** por:

```markdown
## Estado atual

**Fase 1 concluída.** O catálogo mora no D1 `eme-praia`. O site continua
estático: `next build` busca `GET /api/catalogo.json` no Worker `eme-praia`
e assa o HTML. Os dois estão em `https://eme-praia.pedidos-jp.workers.dev`.

Próximo: Fase 2 (teste do Access num Worker descartável, depois o painel).

## Os dois Workers e o banco

| | Pasta | Nome na Cloudflare | Faz |
|---|---|---|---|
| Site + API de leitura | `loja/` | `eme-praia` | serve `out/`, `GET /api/catalogo.json` |
| Painel | `painel/` | `eme-praia-painel` | dono das migrations; rotas na Fase 2 |

Os dois apontam pro mesmo `database_id` no `wrangler.jsonc`. Se um dia
divergirem, o site lê um banco e o painel escreve em outro — conferir os dois
arquivos antes de qualquer `wrangler d1 create`.

**Dev local.** Cada pasta tem seu `.wrangler/`, então os dois Workers teriam
dois bancos locais. Todos os scripts passam `--persist-to ../.wrangler-state`
pra que o D1 local seja um só. Ordem: `painel: npm run db:migrate:local`,
depois `loja: npm run worker:dev` (porta 8787), depois `loja: npm run dev` com
`API_URL=http://localhost:8787` no `.env.local`.

**Migration nova.** Arquivo `painel/migrations/000N_nome.sql`, aplicar local,
rodar `npm run test:worker` na loja (os testes aplicam as migrations num D1
em memória), depois `npm run db:migrate:remote`.

**Deploy.** `loja: npm run deploy` (build + deploy). Enquanto não há Workers
Builds, é sempre da máquina do Cauê.
```

Na seção **Verificações que valem repetir**, trocar o comando por:

```bash
cd loja && npm test && npm run test:worker && npm run build
```

Na seção **Quando algo quebrar**, adicionar no fim:

```markdown
- **`/api/catalogo.json` devolvendo 500** — o Worker logou `catalogo: erro no
  banco`. Ver com `npx wrangler tail eme-praia`. Quase sempre é migration não
  aplicada no remoto: `painel: npm run db:migrate:remote`.
- **Build com "API_URL nao definida"** — falta o `loja/.env.local`. Copiar de
  `.env.example`.
```

- [ ] **Step 4: Stack**

Em `docs/stack.md`:

Na tabela **Linguagens**, trocar a linha de SQL por:

```
| **SQL** | — | O schema do banco, em `painel/migrations/`. SQLite, o dialeto do D1. |
```

Na seção **Ferramentas de apoio**, trocar a linha do Vitest por (conferir a versão exata em `loja/node_modules/vitest/package.json`):

```
| **Vitest** 4.x | | Dois configs: `vitest.config.ts` roda `lib/*.test.ts` em Node; `vitest.worker.config.ts` roda `worker/*.test.ts` dentro do workerd, com um D1 em memória que recebe as migrations. `npm test` e `npm run test:worker`. |
| **wrangler** 4.131.2 | | A CLI da Cloudflare: `wrangler dev`, `wrangler deploy`, `wrangler d1 ...`. Uma cópia em `loja/`, outra em `painel/`. |
| **@cloudflare/vitest-plugin** 1.1.9 | | O que faz o Vitest rodar dentro do workerd, com bindings de verdade. Exige Vitest 4.1. |
```

Substituir a seção **Para onde isso vai (Fase 1 em diante)** por:

```markdown
## Cloudflare (a partir da Fase 1)

| | Versão | Papel |
|---|---|---|
| **Cloudflare Workers** | — | Dois Workers, `eme-praia` e `eme-praia-painel`. O primeiro serve os arquivos estáticos (grátis, ilimitado) e a API de leitura. |
| **Cloudflare D1** | — | Banco SQLite gerenciado, chamado `eme-praia`. Guarda catálogo e disponibilidade. Os dois Workers apontam pro mesmo `database_id`. |
| **Hono** | 4.13.7 | As rotas HTTP dentro do Worker. Faz o papel do Express, mas feito pra borda, sem depender de Node. Tem JSX embutido, que o painel usa na Fase 2. |
| **Zod** | 4.6.5 | Valida o que vem da API antes de virar página (`loja/lib/schema.ts`). Produto inválido é pulado com log; API fora derruba o build de propósito. |
| **Cloudflare Access** | — | Fase 2. Login do painel por código no e-mail. |
| **Cloudflare R2** | — | Fase 3. Precisa ser habilitado no dashboard (pede cartão) antes. |
```

- [ ] **Step 5: Decisões**

Em `docs/decisoes.md`, adicionar antes de **Decisões de imagem**:

```markdown
---

## 13. Dois Workers, um banco.

`eme-praia` (em `loja/`) serve o site e a API de leitura. `eme-praia-painel`
(em `painel/`) é o painel e a API de escrita, inteiro atrás do Cloudflare
Access. Os dois têm binding pro mesmo D1.

**Por quê.** O Access, hoje, protege um Worker inteiro pelo botão "Protect
this Worker behind Access", e isso funciona no `workers.dev` sem domínio
próprio. Proteger só um caminho (`/painel`) exigiria um domínio na zona, que
não existe ainda. Com dois Workers a fronteira de segurança é o Worker
inteiro: não há regra de caminho pra errar, e a loja não tem uma linha de
escrita.

**O custo.** Dois `wrangler.jsonc`, dois deploys, e o `database_id` repetido
nos dois. Em dev, os scripts compartilham o estado local com
`--persist-to ../.wrangler-state` pra não virar dois bancos.

**O Cookeria não é referência de formato.** Ele roda `@opennextjs/cloudflare`
(Next em runtime no Worker), exatamente o que a decisão 1 descarta aqui.
```

- [ ] **Step 6: Commit**

```bash
git add README.md docs/
git commit -m "docs: Fase 1 concluida — dois Workers, um banco (decisao 13), runbook e stack

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Verificação final da Fase 1 (controller, antes de mesclar em `main`)

1. `cd loja && npm test && npm run test:worker && npm run build` passam.
2. `https://eme-praia.pedidos-jp.workers.dev/` abre; `/produto/top-tanga-sand` tem `<title>` próprio; `/api/catalogo.json` responde; `/nao-existe` dá 404 com a página do Next.
3. `loja/data/` não existe; `painel/scripts/` não existe; `grep -rn "@/data" loja --include=*.ts --include=*.tsx` (fora de `node_modules`) não acha nada.
4. `API_URL=http://127.0.0.1:9 npm run build` falha.
5. `git log --format=%ae` da branch só tem `cauefranco01@gmail.com`; nenhum commit contém emoji.
6. `git status --short` limpo; `.env.local` e `.wrangler-state/` ignorados.
