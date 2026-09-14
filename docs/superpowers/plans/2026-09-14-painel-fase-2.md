# Painel — Fase 2 (login por senha + tela de estoque + site reagindo) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Revisado em 2026-09-14: o login mudou de Cloudflare Access pra senha.** Ver a emenda no topo do spec e a decisão 11 reescrita. A **Task 0 (teste do Access no celular) deixou de existir** — não há mais gate de dashboard antes de escrever código. A Task 1 virou o login por senha; as Tasks 2 e 3 mudaram só como os testes se autenticam; as Tasks 4 e 5 não mudaram.

**Goal:** A Mayara abre `eme-praia-painel.pedidos-jp.workers.dev` no celular, digita a senha uma vez, vê os produtos e toca num tamanho adulto pra alternar disponível/esgotado; por produto, uma chave "Tem versão kids". A loja reflete o toque em até 30 s, sem rebuild.

**Architecture:** O Worker `eme-praia-painel` (Hono) ganha uma tela de login, um middleware que exige cookie de sessão assinado, uma tela de estoque em HTML gerada por JSX do Hono e uma API de escrita com dois `PATCH` validados por Zod. O Worker da loja ganha `GET /api/disponibilidade.json` (30 s de cache). No site, um `DisponibilidadeProvider` busca esse JSON no navegador e `useProdutoAoVivo(produto)` entrega aos cards e à página do produto o produto com `tamanhos` e `temKids` corrigidos.

**Tech Stack:** O da Fase 1 (Next 14 estático, Hono 4.13, Zod 4.6, wrangler 4.131, `@cloudflare/vitest-plugin` 1.1, Vitest 4). Novo: `@hono/zod-validator` 0.9.1 e JSX do Hono no painel. Nenhuma dependência de autenticação: o login usa só `crypto.subtle`, que o runtime já tem.

Spec: `docs/superpowers/specs/2026-09-14-painel-fases-1-2-design.md`
Pré-requisito: Fase 1 mesclada em `main` (plano `2026-09-14-painel-fase-1.md`).

## Global Constraints

- Todo comando roda na pasta indicada em cada step (`loja/` ou `painel/`). Os `git` rodam na raiz do repo `eme-praia`. Comandos são pra Git Bash.
- Commits saem da conta `cauefranco01@gmail.com`. Toda mensagem termina com o trailer `Co-Authored-By:` do modelo que escreveu o commit — os exemplos abaixo mostram o formato, não o nome a usar. A Fase 1 saiu com `Claude Fable 5.1`; a Fase 2 começou com `Claude Opus 5 (1M context)`.
- **Nada do MazyOS entra neste repo.** `git rev-parse --show-toplevel` tem que devolver `.../clientes/eme-praia`.
- Branch de trabalho: `painel-fase-2`, a partir de `main`.
- Nomes fixos: Worker `eme-praia-painel`; binding `DB`; secret `SENHA_PAINEL`; cookie `sessao`; rota de login `/entrar`.
- **A senha nunca entra no repo.** Em produção é secret (`wrangler secret put SENHA_PAINEL`); no local, `painel/.dev.vars` (ignorado pelo git). Nunca em `wrangler.jsonc`, nunca num arquivo versionado, nunca num log ou mensagem de erro. Nos testes, uma senha de teste literal — que não é a de produção.
- **Sem `SENHA_PAINEL` no ambiente, o painel recusa tudo.** Falta de configuração fecha, não abre.
- Rotas de escrita: `PATCH /api/produtos/:id/tamanhos/:tamanho` com `{ disponivel: boolean }`; `PATCH /api/produtos/:id` com `{ temKids: boolean }`. 400 corpo inválido, 404 não encontrado, 401 sem cookie válido. Sucesso devolve 200 com o estado gravado.
- Toda rota que não seja `/entrar` passa pelo middleware `exigirSenha`. `GET` sem cookie redireciona pra `/entrar`; qualquer outro método responde 401 JSON sem tocar no banco.
- Formato de `/api/disponibilidade.json`: `{ [slug]: { temKids: boolean, tamanhos: { [tamanho]: boolean } } }`, só produtos ativos, `Cache-Control: public, max-age=30, s-maxage=30`.
- Texto do aviso de falha, literal: `Não salvou. Tenta de novo.` Rótulo da chave, literal: `Tem versão kids`.
- Cores da marca (de `loja/tailwind.config.ts`): laranja `#FB7F20`, terra `#B35207`, grafite `#323233`, breu `#1F1F20`, gelo `#FAFAFA`, concha `#E7E6E2`. Regra: laranja preenche, terra escreve (decisão 12).
- Alvo de toque mínimo 44 x 44 px.
- Estado local do wrangler: sempre `--persist-to ../.wrangler-state`.
- Sem emojis em código, docs ou commits. Comentários de código sem acento (padrão do repo).

---

### Task 1: Login por senha — sessão assinada, middleware e testes com D1 em memória

**Files:**
- Create: `painel/src/sessao.ts`
- Create: `painel/src/sessao.test.ts`
- Create: `painel/src/login.tsx`
- Create: `painel/src/login.test.ts`
- Create: `painel/src/teste-ajuda.ts`
- Create: `painel/src/apply-migrations.ts`
- Create: `painel/src/env.d.ts`
- Create: `painel/vitest.config.ts`
- Create: `painel/.dev.vars.example` (e `.dev.vars`, que não é versionado)
- Rename + rewrite: `painel/src/index.ts` → `painel/src/index.tsx`
- Modify: `painel/wrangler.jsonc` (`main` aponta pro `.tsx`)
- Modify: `painel/package.json` (devDependencies, script `test`)
- Modify: `painel/tsconfig.json` (linha `types`)

**Interfaces:**
- Produces: `Env = { DB: D1Database; SENHA_PAINEL?: string }` e `Variaveis = { senha: string }` em `src/login.tsx`, reexportados por `src/index.tsx`; `app: Hono<{ Bindings: Env; Variables: Variaveis }>` exportado **named** além do `export default app` — as Tasks 2 e 3 registram rotas nesse `app` e os testes o importam de `./index`; middleware `exigirSenha` e sub-app `login` em `src/login.tsx`; `SENHA_TESTE`, `ambiente()` e `comSessao()` em `src/teste-ajuda.ts`, usados pelos testes das Tasks 2 e 3.

- [ ] **Step 1: Dependências de teste e configuração**

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

(O `jsx: "react-jsx"` e o `jsxImportSource: "hono/jsx"` já estão lá desde a Fase 1.)

- [ ] **Step 2: Vitest com as migrations do próprio painel**

Criar `painel/vitest.config.ts`:

```ts
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

// Os testes rodam dentro do workerd com um D1 em memoria que recebe as
// migrations desta pasta (schema + seed).
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

Criar `painel/src/apply-migrations.ts` (mesmo padrão de `loja/worker/apply-migrations.ts`):

```ts
import { applyD1Migrations, reset } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { beforeEach } from 'vitest'

// Setup file: roda antes de cada teste. O plugin nao isola o armazenamento
// sozinho, entao o reset() limpa os bindings e as migrations (schema + seed)
// sao reaplicadas do zero. Assim o UPDATE de um teste nao vaza pro seguinte.
beforeEach(async () => {
  await reset()
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
})
```

Criar `painel/src/env.d.ts`:

```ts
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    SENHA_PAINEL?: string
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }
}
```

- [ ] **Step 3: Teste da sessão (falhando)**

Criar `painel/src/sessao.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { NOME_COOKIE, cookieVale, criarCookie, senhaConfere } from './sessao'

const SENHA = 'quatro palavras soltas aqui'

describe('senhaConfere', () => {
  it('aceita a senha certa', async () => {
    expect(await senhaConfere(SENHA, SENHA)).toBe(true)
  })

  it('recusa senha errada do mesmo tamanho', async () => {
    expect(await senhaConfere('quatro palavras soltas aqul', SENHA)).toBe(false)
  })

  it('recusa senha errada de outro tamanho', async () => {
    expect(await senhaConfere('x', SENHA)).toBe(false)
  })

  it('recusa senha vazia', async () => {
    expect(await senhaConfere('', SENHA)).toBe(false)
  })

  it('recusa prefixo da senha certa', async () => {
    expect(await senhaConfere('quatro palavras', SENHA)).toBe(false)
  })
})

describe('criarCookie / cookieVale', () => {
  it('o cookie que ele cria, ele aceita', async () => {
    const { valor } = await criarCookie(SENHA)
    expect(await cookieVale(valor, SENHA)).toBe(true)
  })

  it('o nome do cookie e sessao', () => {
    expect(NOME_COOKIE).toBe('sessao')
  })

  it('expira em 90 dias', async () => {
    const agora = Date.UTC(2026, 0, 1)
    const { expiraEm } = await criarCookie(SENHA, agora)
    expect(expiraEm).toBe(Math.floor(agora / 1000) + 90 * 24 * 60 * 60)
  })

  it('cookie de outra senha e recusado: trocar a senha desloga todo mundo', async () => {
    const { valor } = await criarCookie(SENHA)
    expect(await cookieVale(valor, 'a senha nova')).toBe(false)
  })

  it('cookie vencido e recusado', async () => {
    const { valor } = await criarCookie(SENHA, Date.UTC(2026, 0, 1))
    expect(await cookieVale(valor, SENHA, Date.UTC(2026, 0, 1))).toBe(true)
    expect(await cookieVale(valor, SENHA, Date.UTC(2026, 6, 1))).toBe(false)
  })

  it('esticar a validade sem reassinar nao cola', async () => {
    const { valor, expiraEm } = await criarCookie(SENHA)
    const assinatura = valor.slice(valor.indexOf('.') + 1)
    const esticado = `${expiraEm + 999999}.${assinatura}`
    expect(await cookieVale(esticado, SENHA)).toBe(false)
  })

  it('assinatura adulterada e recusada', async () => {
    const { valor, expiraEm } = await criarCookie(SENHA)
    expect(await cookieVale(`${expiraEm}.naoEhAAssinatura`, SENHA)).toBe(false)
    expect(await cookieVale(`${valor}x`, SENHA)).toBe(false)
  })

  it('lixo e ausencia sao recusados sem explodir', async () => {
    for (const lixo of [undefined, '', '.', 'abc', 'abc.def', '123.', `${Date.now()}`]) {
      expect(await cookieVale(lixo, SENHA)).toBe(false)
    }
  })
})
```

Run (em `painel/`): `npm test`
Expected: FAIL, `./sessao` não existe.

- [ ] **Step 4: A sessão**

Criar `painel/src/sessao.ts`:

```ts
// Login por senha (decisao 11). Nao existe tabela de sessao: o cookie se
// prova sozinho por HMAC, e a chave do HMAC e a propria senha. Consequencia
// de proposito: trocar SENHA_PAINEL invalida todo cookie ja emitido, o que
// faz as vezes de "sair de todos os aparelhos" sem escrever tela de logout.

export const NOME_COOKIE = 'sessao'
export const DURACAO_SEGUNDOS = 90 * 24 * 60 * 60

const bytes = (texto: string) => new TextEncoder().encode(texto)

/** Compara sem vazar tamanho nem prefixo: os dois viram 32 bytes antes.
 *  Comparar as strings direto daria pra medir acerto por caractere. */
export async function senhaConfere(enviada: string, certa: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', bytes(enviada)),
    crypto.subtle.digest('SHA-256', bytes(certa)),
  ])
  return crypto.subtle.timingSafeEqual(a, b)
}

function base64url(dados: ArrayBuffer): string {
  const binario = String.fromCharCode(...new Uint8Array(dados))
  return btoa(binario).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function assinar(expiraEm: number, senha: string): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', bytes(senha), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return base64url(await crypto.subtle.sign('HMAC', chave, bytes(String(expiraEm))))
}

/** Valor do cookie: `<expiraEm em segundos>.<assinatura>`. */
export async function criarCookie(
  senha: string,
  agora: number = Date.now(),
): Promise<{ valor: string; expiraEm: number }> {
  const expiraEm = Math.floor(agora / 1000) + DURACAO_SEGUNDOS
  return { valor: `${expiraEm}.${await assinar(expiraEm, senha)}`, expiraEm }
}

export async function cookieVale(
  valor: string | undefined,
  senha: string,
  agora: number = Date.now(),
): Promise<boolean> {
  if (!valor) return false

  const corte = valor.indexOf('.')
  if (corte < 1) return false

  const expiraEm = Number(valor.slice(0, corte))
  if (!Number.isSafeInteger(expiraEm) || expiraEm * 1000 <= agora) return false

  const recebida = valor.slice(corte + 1)
  const esperada = await assinar(expiraEm, senha)
  // timingSafeEqual explode com tamanhos diferentes, e o tamanho da
  // assinatura e fixo: tamanho errado ja e cookie invalido.
  if (recebida.length !== esperada.length) return false
  return crypto.subtle.timingSafeEqual(bytes(recebida), bytes(esperada))
}
```

Run (em `painel/`): `npm test`
Expected: os 13 testes de `sessao.test.ts` passam.

- [ ] **Step 5: Ajuda dos testes**

Criar `painel/src/teste-ajuda.ts`:

```ts
import { env } from 'cloudflare:workers'
import { NOME_COOKIE, criarCookie } from './sessao'

// Senha usada so nos testes. A de producao vive em secret e nunca aparece
// em arquivo versionado.
export const SENHA_TESTE = 'senha de teste do painel'

/** Bindings pra app.request(): o D1 em memoria mais a senha de teste. */
export const ambiente = () => ({ DB: env.DB, SENHA_PAINEL: SENHA_TESTE })

/** Headers com um cookie de sessao valido pra SENHA_TESTE. */
export async function comSessao(extras: Record<string, string> = {}): Promise<Record<string, string>> {
  const { valor } = await criarCookie(SENHA_TESTE)
  return { cookie: `${NOME_COOKIE}=${valor}`, ...extras }
}
```

- [ ] **Step 6: Teste do login e do middleware (falhando)**

Criar `painel/src/login.test.ts`:

```ts
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { app } from './index'
import { SENHA_TESTE, ambiente, comSessao } from './teste-ajuda'

function form(senha: string) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ senha }).toString(),
  }
}

describe('exigirSenha', () => {
  it('GET sem cookie redireciona pro login', async () => {
    const r = await app.request('/', {}, ambiente())
    expect(r.status).toBe(302)
    expect(r.headers.get('location')).toBe('/entrar')
  })

  it('metodo que nao e GET responde 401 em JSON, nao redireciona', async () => {
    const r = await app.request('/', { method: 'POST' }, ambiente())
    expect(r.status).toBe(401)
    expect(await r.json()).toEqual({ erro: 'sessao expirada' })
  })

  it('com cookie valido passa', async () => {
    const r = await app.request('/', { headers: await comSessao() }, ambiente())
    expect(r.status).toBe(200)
  })

  it('cookie assinado com outra senha nao passa', async () => {
    const r = await app.request('/', { headers: await comSessao() }, { DB: env.DB, SENHA_PAINEL: 'outra senha' })
    expect(r.status).toBe(302)
  })

  it('sem SENHA_PAINEL no ambiente, o painel fecha em vez de abrir', async () => {
    for (const caminho of ['/', '/entrar']) {
      const r = await app.request(caminho, {}, { DB: env.DB })
      expect(r.status).toBe(503)
    }
  })
})

describe('GET /entrar', () => {
  it('mostra o formulario de senha', async () => {
    const r = await app.request('/entrar', {}, ambiente())
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toContain('text/html')

    const html = await r.text()
    expect(html).toContain('type="password"')
    expect(html).toContain('name="senha"')
    expect(html).toContain('method="post"')
  })

  it('quem ja entrou volta pro painel', async () => {
    const r = await app.request('/entrar', { headers: await comSessao() }, ambiente())
    expect(r.status).toBe(302)
    expect(r.headers.get('location')).toBe('/')
  })
})

describe('POST /entrar', () => {
  it('senha certa grava o cookie e volta pro painel', async () => {
    const r = await app.request('/entrar', form(SENHA_TESTE), ambiente())
    expect(r.status).toBe(302)
    expect(r.headers.get('location')).toBe('/')

    const cookie = r.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('sessao=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Max-Age=7776000')
  })

  it('o cookie que ela recebe abre o painel', async () => {
    const entrada = await app.request('/entrar', form(SENHA_TESTE), ambiente())
    const cookie = (entrada.headers.get('set-cookie') ?? '').split(';')[0]

    const r = await app.request('/', { headers: { cookie } }, ambiente())
    expect(r.status).toBe(200)
  })

  it('senha errada nao grava cookie', async () => {
    const r = await app.request('/entrar', form('nao e a senha'), ambiente())
    expect(r.status).toBe(401)
    expect(r.headers.get('set-cookie')).toBeNull()
    expect(await r.text()).toContain('Senha errada.')
  })

  it('corpo sem o campo senha nao grava cookie', async () => {
    const r = await app.request(
      '/entrar',
      { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: '' },
      ambiente(),
    )
    expect(r.status).toBe(401)
    expect(r.headers.get('set-cookie')).toBeNull()
  })

  it('a senha nunca volta no HTML', async () => {
    const html = await (await app.request('/entrar', form('nao e a senha'), ambiente())).text()
    expect(html).not.toContain(SENHA_TESTE)
    expect(html).not.toContain('nao e a senha')
  })

  it('Secure so em https, pra nao quebrar o dev em localhost', async () => {
    const seguro = await app.request('https://painel.test/entrar', form(SENHA_TESTE), ambiente())
    expect(seguro.headers.get('set-cookie')).toContain('Secure')

    const local = await app.request('http://localhost:8787/entrar', form(SENHA_TESTE), ambiente())
    expect(local.headers.get('set-cookie')).not.toContain('Secure')
  })
})
```

Run (em `painel/`): `npm test`
Expected: FAIL, `app` não é exportado de `./index` (hoje só existe `default`) e `/entrar` não existe.

- [ ] **Step 7: O login e o middleware**

Criar `painel/src/login.tsx`:

```tsx
import { Hono, type MiddlewareHandler } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import type { FC } from 'hono/jsx'
import { DURACAO_SEGUNDOS, NOME_COOKIE, cookieVale, criarCookie, senhaConfere } from './sessao'

// A porta do painel (decisao 11). Uma senha, conferida no servidor, e um
// cookie assinado. O mesmo middleware cobre a tela e a API de escrita: nao
// existe rota protegida so pela aparencia.

export type Env = {
  DB: D1Database
  /** Secret em producao, .dev.vars no local. Sem ela o painel recusa tudo. */
  SENHA_PAINEL?: string
}

export type Variaveis = { senha: string }

// Espera antes de responder senha errada. E freio contra chute em massa, nao
// tranca: o que segura de verdade e o tamanho da senha.
const ESPERA_ERRO_MS = 500

const espera = (ms: number) => new Promise((pronto) => setTimeout(pronto, ms))

export const exigirSenha: MiddlewareHandler<{ Bindings: Env; Variables: Variaveis }> = async (c, next) => {
  const senha = c.env.SENHA_PAINEL
  // Falta de configuracao fecha o painel; nao escancara.
  if (!senha) return c.text('Painel sem senha configurada. Ver docs/runbook-caue.md.', 503)

  c.set('senha', senha)
  if (c.req.path === '/entrar') return next()

  if (await cookieVale(getCookie(c, NOME_COOKIE), senha)) return next()

  if (c.req.method === 'GET') return c.redirect('/entrar', 302)
  return c.json({ erro: 'sessao expirada' }, 401)
}

const CSS = `
  :root { --laranja: #FB7F20; --terra: #B35207; --grafite: #323233; --gelo: #FAFAFA; --concha: #E7E6E2; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
         background: var(--gelo); color: var(--grafite); font: 16px/1.4 system-ui, sans-serif; }
  form { width: 100%; max-width: 320px; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  p { margin: 0 0 20px; font-size: 13px; color: var(--terra); }
  label { display: block; font-size: 13px; margin-bottom: 6px; }
  input { width: 100%; min-height: 44px; padding: 0 12px; font: inherit; border-radius: 10px;
          border: 1px solid var(--concha); background: #fff; color: inherit; }
  button { width: 100%; min-height: 44px; margin-top: 12px; font: inherit; font-weight: 600;
           border: 0; border-radius: 10px; background: var(--laranja); color: var(--gelo); cursor: pointer; }
  .erro { margin: 12px 0 0; color: var(--terra); font-size: 14px; font-weight: 600; }
`

// Nada do que ela digitou volta preenchido: a senha nao passa pelo HTML nem
// numa ida.
const TelaLogin: FC<{ erro?: boolean }> = ({ erro }) => (
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex, nofollow" />
      <title>Eme Praia — entrar</title>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </head>
    <body>
      <form method="post" action="/entrar">
        <h1>Estoque</h1>
        <p>Eme Praia</p>
        <label for="senha">Senha</label>
        <input id="senha" name="senha" type="password" autocomplete="current-password" autofocus required />
        <button type="submit">Entrar</button>
        {erro && <p class="erro">Senha errada.</p>}
      </form>
    </body>
  </html>
)

export const login = new Hono<{ Bindings: Env; Variables: Variaveis }>()

login.get('/entrar', async (c) => {
  if (await cookieVale(getCookie(c, NOME_COOKIE), c.get('senha'))) return c.redirect('/', 302)
  return c.html(<TelaLogin />)
})

login.post('/entrar', async (c) => {
  const corpo = await c.req.parseBody()
  const enviada = typeof corpo.senha === 'string' ? corpo.senha : ''

  if (!(await senhaConfere(enviada, c.get('senha')))) {
    await espera(ESPERA_ERRO_MS)
    return c.html(<TelaLogin erro />, 401)
  }

  const { valor } = await criarCookie(c.get('senha'))
  setCookie(c, NOME_COOKIE, valor, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: DURACAO_SEGUNDOS,
    // Com Secure ligado o cookie nao gruda em http://localhost em alguns
    // navegadores. Em producao o Worker so atende https, entao la ele entra.
    secure: new URL(c.req.url).protocol === 'https:',
  })
  return c.redirect('/', 302)
})
```

Apagar `painel/src/index.ts` (com `git rm`, pra o rename ficar no histórico) e criar `painel/src/index.tsx`:

```tsx
import { Hono } from 'hono'
import { exigirSenha, login, type Env, type Variaveis } from './login'

// Painel de gestao da Eme Praia. Tudo que nao e /entrar passa por
// exigirSenha antes de qualquer rota (decisao 11). As rotas de estoque e a
// API de escrita entram nas proximas tasks.

export type { Env, Variaveis }

export const app = new Hono<{ Bindings: Env; Variables: Variaveis }>()

app.use('*', exigirSenha)
app.route('/', login)

app.get('/', (c) => c.text('Painel Eme Praia: em construcao.'))

export default app
```

Em `painel/wrangler.jsonc`, trocar a linha do `main` por:

```jsonc
  "main": "src/index.tsx",
```

- [ ] **Step 8: Rodar e ver passar**

Run (em `painel/`): `npm test && npm run typecheck`
Expected: 27 testes passando (13 de `sessao.test.ts` + 14 de `login.test.ts`); typecheck limpo.

- [ ] **Step 9: Dev local com a senha**

Criar `painel/.dev.vars.example`:

```
# Copie pra .dev.vars (ignorado pelo git) e ponha a senha do painel.
# Em producao ela nao vem daqui: e secret, posta com
#   npx wrangler secret put SENHA_PAINEL
SENHA_PAINEL=troque-esta-senha
```

Run (em `painel/`):
```bash
cp .dev.vars.example .dev.vars
git check-ignore .dev.vars
```
Expected: imprime `.dev.vars`. Se não imprimir nada, **parar**: o arquivo entraria no commit. Acrescentar `.dev.vars` ao `painel/.gitignore` antes de seguir.

- [ ] **Step 10: Commit**

```bash
git add painel/
git status --short
git commit -m "feat(painel): login por senha com cookie assinado e testes com D1 em memoria

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Conferir que `painel/.dev.vars` **não** aparece no `git status --short`.

---

### Task 2: API de escrita — dois `PATCH` validados

**Files:**
- Create: `painel/src/api.ts`
- Create: `painel/src/api.test.ts`
- Modify: `painel/src/index.tsx` (monta `api` em `/api`)
- Modify: `painel/package.json` (dependencies `zod`, `@hono/zod-validator`)

**Interfaces:**
- Consumes: `Env`, `Variaveis`, `app` (Task 1); `ambiente()` e `comSessao()` de `src/teste-ajuda.ts` (Task 1); tabelas `produtos`, `tamanhos`.
- Produces: `api: Hono` com `PATCH /produtos/:id/tamanhos/:tamanho` e `PATCH /produtos/:id`, montado em `/api`. O script da Task 3 chama essas URLs.

- [ ] **Step 1: Dependências**

Run (em `painel/`): `npm install zod@4.6.5 @hono/zod-validator@0.9.1`

- [ ] **Step 2: Testes (falhando)**

Criar `painel/src/api.test.ts`:

```ts
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { app } from './index'
import { ambiente, comSessao } from './teste-ajuda'

async function patch(caminho: string, corpo: unknown) {
  return app.request(
    caminho,
    {
      method: 'PATCH',
      headers: await comSessao({ 'content-type': 'application/json' }),
      body: JSON.stringify(corpo),
    },
    ambiente(),
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

  it('sem cookie responde 401 antes de tocar no banco', async () => {
    const r = await app.request(
      '/api/produtos/top-tanga-sand/tamanhos/M',
      { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ disponivel: false }) },
      ambiente(),
    )
    expect(r.status).toBe(401)
    expect(await disponivelNoBanco('top-tanga-sand', 'M')).toBe(1)
  })

  it('cookie assinado com outra senha nao escreve', async () => {
    const r = await app.request(
      '/api/produtos/top-tanga-sand/tamanhos/M',
      {
        method: 'PATCH',
        headers: await comSessao({ 'content-type': 'application/json' }),
        body: JSON.stringify({ disponivel: false }),
      },
      { DB: env.DB, SENHA_PAINEL: 'outra senha' },
    )
    expect(r.status).toBe(401)
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

Em `painel/src/index.tsx`, adicionar o import e a montagem (a rota `GET /` continua):

```tsx
import { api } from './api'
```

e, depois de `app.route('/', login)`:

```tsx
app.route('/api', api)
```

- [ ] **Step 4: Rodar e ver passar**

Run (em `painel/`): `npm test && npm run typecheck`
Expected: 38 testes passando (27 da Task 1 + 11 novos); typecheck limpo.

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
- Modify: `painel/src/index.tsx` (`GET /` passa a devolver a tela)
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
import { ambiente, comSessao } from './teste-ajuda'

async function abrirPainel() {
  return app.request('/', { headers: await comSessao() }, ambiente())
}

describe('GET /', () => {
  it('lista os produtos agrupados por categoria com os botoes de tamanho', async () => {
    const r = await abrirPainel()
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
    const html = await (await abrirPainel()).text()
    expect(html).toContain('data-produto="top-tanga-sand" data-tamanho="M" aria-pressed="false"')
    expect(html).toMatch(/data-kids="top-tanga-sand"(?![^>]*checked)/)
  })

  it('produto arquivado nao aparece', async () => {
    await env.DB.prepare(`UPDATE produtos SET ativo = 0 WHERE id = 'top-tanga-sand'`).run()
    const html = await (await abrirPainel()).text()
    expect(html).not.toContain('Top Meia Taça + Tanga Lateral Sand')
  })

  it('escapa HTML no nome do produto', async () => {
    await env.DB.prepare(`UPDATE produtos SET nome = 'Top <b>x</b>' WHERE id = 'top-tanga-sand'`).run()
    const html = await (await abrirPainel()).text()
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

type Props = { categorias: Categoria[]; produtos: Produto[] }

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

export const Tela: FC<Props> = ({ categorias, produtos }) => (
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
        <p>Eme Praia</p>
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

Em `painel/src/index.tsx`, trocar a rota `GET /` por:

```tsx
import { lerCatalogo } from '../../loja/worker/consultas'
import { Tela } from './tela'
```

```tsx
app.get('/', async (c) => {
  const { categorias, produtos } = await lerCatalogo(c.env.DB)
  return c.html(<Tela categorias={categorias} produtos={produtos} />)
})
```

(`index.tsx` e o JSX já estão configurados desde a Task 1.)

- [ ] **Step 3: Rodar e ver passar**

Run (em `painel/`): `npm test && npm run typecheck`
Expected: 42 testes passando (38 das Tasks 1 e 2 + 4 novos); typecheck limpo.

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
  // Sessao vencida (ou senha trocada): manda logar de novo em vez de
  // mostrar "nao salvou" pra sempre.
  if (r.status === 401) {
    location.href = '/entrar'
    throw new Error('401')
  }
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
  // So o painel.js. Assets sao servidos antes do Worker rodar, entao este
  // arquivo fica fora do login. E por isso que ele nao tem segredo nenhum:
  // so liga toque em fetch. Quem protege os dados e o middleware nas rotas.
  "assets": { "directory": "./public" },
```

- [ ] **Step 5: Olhar no navegador**

Run (em `painel/`):
```bash
npm run db:migrate:local
npm run dev
```
Expected: `http://localhost:8787/` cai na tela de senha; digitando a senha do `.dev.vars`, abre a tela de estoque e o navegador não pede de novo ao recarregar. Tocar no "M" do primeiro produto: fica riscado na hora. Recarregar: continua riscado. Desligar a chave kids: recarregar mantém desligada. Parar o `npm run dev`, tocar num botão: aparece "Não salvou. Tenta de novo." e o botão volta.

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

### Task 6: Deploy dos dois Workers, senha em produção, verificação de ponta a ponta e docs

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
Expected: `Painel sem senha configurada...` e `503`. O painel está fechado porque o secret ainda não existe — é o comportamento certo.

Run: `curl -s https://eme-praia.pedidos-jp.workers.dev/api/disponibilidade.json | head -c 200`
Expected: JSON começando em `{"top-tanga-sand":{"temKids":true,"tamanhos":{"P":true`.

- [ ] **Step 2: Conferir o limite de CPU do plano (bloqueante pro painel)**

O login deriva a chave do cookie com PBKDF2, 100 mil iterações — medidas em **~93 ms de CPU**. O plano **gratuito** do Workers corta em 10 ms por invocação e devolve erro 1102; o **pago** dá 30 s. Só a primeira requisição de cada isolate paga (a chave fica memorizada), mas é justamente ela que falharia, e um painel de pouco movimento está frio quase sempre.

Conferir em `dash.cloudflare.com` → Workers & Pages → Plans qual é o plano da conta.

- **Pago:** nada a fazer, seguir.
- **Gratuito:** baixar `ITERACOES` em `painel/src/sessao.ts` de `100_000` pra `5_000` (~5 ms), rodar `npm test` de novo, e acrescentar à decisão 11 um parágrafo dizendo que a derivação foi reduzida por causa do limite de CPU do plano grátis, que isso enfraquece a defesa contra quebra offline de um cookie roubado, e que subir de plano permite voltar pra 100 mil.

Depois do deploy, confirmar na prática:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://eme-praia-painel.pedidos-jp.workers.dev/entrar
```
Expected: `200`. Se vier `500` ou a página de erro 1102 da Cloudflare, é o limite de CPU — baixar as iterações.

- [ ] **Step 3: A senha em produção (Cauê, no terminal dele)**

A senha **não** entra no repo nem passa pelo controller por arquivo. O Cauê roda e digita:

```bash
cd painel && npx wrangler secret put SENHA_PAINEL
```

Expected: o wrangler pede o valor, esconde o que é digitado e confirma `Success! Uploaded secret SENHA_PAINEL`. O secret já vale sem novo deploy.

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://eme-praia-painel.pedidos-jp.workers.dev/`
Expected: `302` (redireciona pra `/entrar`), não mais 503.

Run: `curl -s https://eme-praia-painel.pedidos-jp.workers.dev/entrar | grep -c 'type="password"'`
Expected: `1`.

Conferir que a senha **não** vaza como variável de texto: Workers & Pages → `eme-praia-painel` → Settings → Variables. `SENHA_PAINEL` tem que aparecer como **Secret** (valor escondido), nunca como plain text.

- [ ] **Step 4: A API não abre sem cookie**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH \
  -H 'content-type: application/json' -d '{"disponivel":false}' \
  https://eme-praia-painel.pedidos-jp.workers.dev/api/produtos/top-tanga-sand/tamanhos/M
```
Expected: `401`.

Conferir que não escreveu:
```bash
curl -s https://eme-praia.pedidos-jp.workers.dev/api/disponibilidade.json | grep -o '"top-tanga-sand":{[^}]*}[^}]*}'
```
Expected: `"M":true` continua lá.

- [ ] **Step 5: Ponta a ponta no celular**

1. Cauê, no celular: abrir o painel, digitar a senha. A tela lista os 17 produtos em duas categorias.
2. Fechar o navegador e abrir de novo: **não pede senha** (o cookie durou).
3. Tocar em "M" do primeiro produto: fica riscado na hora.
4. Abrir `https://eme-praia.pedidos-jp.workers.dev/produto/top-tanga-sand` em até 30 s: M riscado e desabilitado. Na home, o card do produto também.
5. Desligar "Tem versão kids" do mesmo produto. Recarregar a página do produto em até 30 s: a fileira "Linha kids" sumiu.
6. Reverter os dois toques. Conferir que voltaram no site.
7. Digitar uma senha errada numa aba anônima: aparece "Senha errada." e não entra.
8. Mayara, no celular dela: recebe a senha por um canal que não é grupo, entra, repete 3. Anotar o que ela estranhou.

- [ ] **Step 6: README**

Na tabela **Fases**, marcar a Fase 2 como concluída. Na seção **Rodando**, adicionar no bloco de `painel/`:

```bash
cp .dev.vars.example .dev.vars   # e colocar a senha do painel
npm run dev                      # localhost:8787, cai na tela de senha
npm run deploy
```

No **Mapa das pastas**, a linha de `painel/` vira:

```
| `painel/` | O painel de gestão e a API de escrita. Cloudflare Worker + D1, inteiro atrás de senha. Dono das migrations |
```

- [ ] **Step 7: Runbook**

Em `docs/runbook-caue.md`, substituir a seção **Estado atual** por:

```markdown
## Estado atual

**Fase 2 concluída.** A Mayara marca tamanho esgotado e liga/desliga kids em
`https://eme-praia-painel.pedidos-jp.workers.dev`, entrando com a senha do
painel. A loja reflete em até 30 s via `/api/disponibilidade.json`.

Próximo: Fase 3 (cadastro de produto, foto). Antes dela: habilitar R2 no
dashboard (pede cartão) e decidir Workers Builds + deploy hook.
```

Na seção **Os dois Workers e o banco**, trocar a linha do painel por:

```
| Painel | `painel/` | `eme-praia-painel` | tela de estoque, `PATCH /api/...`, dono das migrations. **Inteiro atrás de senha** |
```

Adicionar a seção:

```markdown
## A senha do painel

Ela vive em dois lugares e em nenhum arquivo do repo:

- **Produção:** secret do Worker. Pra trocar, `cd painel && npx wrangler secret put SENHA_PAINEL` e digitar a nova. Vale na hora, sem deploy.
- **Dev local:** `painel/.dev.vars` (ignorado pelo git). O `.dev.vars.example` diz o formato.

**Trocar a senha desloga todo mundo.** O cookie de sessão é assinado com a
própria senha, então trocar invalida os cookies já emitidos. É assim que se
tira o acesso de alguém: troca e reenvia só pra quem deve ter.

**Se o painel responder 503 com "Painel sem senha configurada"**, o secret
sumiu do Worker (deploy de outra conta, secret apagado no dashboard). Repor com
o comando acima. O painel fechar sozinho nesse caso é de propósito.

**Se o painel abrir sem pedir senha**, algo muito errado: conferir em
Workers & Pages → `eme-praia-painel` → Settings → Variables que `SENHA_PAINEL`
está como **Secret**, não como texto, e que ninguém subiu um `.dev.vars` junto
no deploy.

**Mandar a senha pra Mayara** por mensagem direta, nunca em grupo. Se cair em
grupo ou print, trocar na hora — é um comando.

**Contra chute em massa não existe defesa no código.** A espera de meio
segundo na senha errada atrapalha quem tenta na mão e mais nada: conexões em
paralelo passam por ela. Quem limita de verdade é regra de rate limiting do
WAF em `POST /entrar` (dashboard → o domínio → Security → WAF → Rate limiting
rules, algo como 10 tentativas por minuto por IP). Não está ligada. Enquanto
não estiver, o que segura é o tamanho da senha.
```

Na seção **Verificações que valem repetir**, adicionar depois do comando da loja:

```bash
cd painel && npm test
```

e na lista, os itens:

```markdown
- Toque no painel aparece no site em até 30 s sem rebuild (o HTML do build
  pode dizer "disponível"; o navegador corrige)
- `PATCH` na API do painel sem estar logado responde 401 e não muda o banco
```

- [ ] **Step 8: Stack**

Em `docs/stack.md`, na tabela **Cloudflare**, **remover** a linha do Cloudflare Access (ele não é mais usado; a decisão 11 explica por quê) e adicionar:

```
| **@hono/zod-validator** | 0.9.1 | Valida o corpo dos `PATCH` do painel com Zod antes da rota rodar. Corpo errado vira 400 sem tocar no banco. |
| **Secrets do Worker** | — | `SENHA_PAINEL`, posta com `wrangler secret put`. Login do painel: senha conferida no servidor e cookie assinado por HMAC com a própria senha (`crypto.subtle`, sem dependência). Nenhuma tabela de sessão. |
```

- [ ] **Step 9: Decisões**

Em `docs/decisoes.md`, na decisão 3, adicionar depois da tabela:

```markdown
**Implementado na Fase 2.** `GET /api/disponibilidade.json` (30 s de cache)
carrega `disponivel` por tamanho **e** `temKids`, porque a chave kids da
Mayara também precisa aparecer sem rebuild. No site,
`components/DisponibilidadeProvider.tsx` busca isso a cada troca de página e
`useProdutoAoVivo` corrige o produto do build. O JSON-LD continua sendo o
estado do build (`lib/jsonld.tsx`).
```

- [ ] **Step 10: Commit**

```bash
git add README.md docs/
git commit -m "docs: Fase 2 concluida — login por senha, overlay de disponibilidade, runbook

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Verificação final da Fase 2 (controller, antes de mesclar em `main`)

1. `cd loja && npm test && npm run test:worker && npm run build` e `cd painel && npm test` passam.
2. Painel sem cookie redireciona pro login; senha errada é recusada; senha certa entra e o celular não pede de novo. Mayara entrou do celular dela.
3. Toque num tamanho muda na hora, recarregar mantém, a loja mostra riscado em até 30 s. Chave kids desligada some com a fileira "Linha kids" em até 30 s.
4. `PATCH` direto na API, sem cookie, responde 401 e não muda o banco.
5. Sem o secret, o painel responde 503 — fecha em vez de abrir.
6. `painel/.dev.vars` não está no git; `git log -p` da branch não contém a senha de produção em lugar nenhum; `SENHA_PAINEL` aparece como **Secret** no dashboard.
7. `git log --format=%ae` da branch só tem `cauefranco01@gmail.com`; nenhum commit contém emoji.
