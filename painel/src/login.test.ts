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

  it('rota sem handler tambem e barrada: a barreira e o catch-all, nao a rota', async () => {
    const r = await app.request('/estoque', {}, ambiente())
    expect(r.status).toBe(302)
    expect(r.headers.get('location')).toBe('/entrar')
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
    expect(cookie).toContain('Path=/')
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

  it('Secure fora de localhost, pra nao quebrar o dev local', async () => {
    const seguro = await app.request('https://painel.test/entrar', form(SENHA_TESTE), ambiente())
    expect(seguro.headers.get('set-cookie')).toContain('Secure')

    const local = await app.request('http://localhost:8787/entrar', form(SENHA_TESTE), ambiente())
    expect(local.headers.get('set-cookie')).not.toContain('Secure')

    const httpRemoto = await app.request('http://eme-praia-painel.workers.dev/entrar', form(SENHA_TESTE), ambiente())
    expect(httpRemoto.headers.get('set-cookie')).toContain('Secure')
  })
})
