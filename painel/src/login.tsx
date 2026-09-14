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

// Espera antes de responder senha errada. Atrapalha chute manual e nada
// mais: quem abrir varias conexoes em paralelo nao e afetado, porque nao
// existe contador nem bloqueio. Limitar de verdade e regra de WAF em
// POST /entrar (anotado no runbook). O que segura hoje e o tamanho da senha.
const ESPERA_ERRO_MS = 500

const espera = (ms: number) => new Promise((pronto) => setTimeout(pronto, ms))

function ehLocal(url: string): boolean {
  const { hostname } = new URL(url)
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

export const exigirSenha: MiddlewareHandler<{ Bindings: Env; Variables: Variaveis }> = async (c, next) => {
  const senha = c.env.SENHA_PAINEL
  // Ponteiro pro runbook fica no comentario, nao na resposta: quem precisa
  // dele esta lendo o codigo. Ver docs/runbook-caue.md, secao da senha.
  if (!senha) return c.text('Painel indisponivel.', 503)

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
    // Preso ao host, nao ao esquema: se alguem abrir o painel por http://
    // em producao, o cookie ainda sai Secure e nao volta em texto claro.
    secure: !ehLocal(c.req.url),
  })
  return c.redirect('/', 302)
})
