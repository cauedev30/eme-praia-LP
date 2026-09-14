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
