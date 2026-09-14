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

  // Conferir o corpo, nao so o status: o Hono devolve 404 pra qualquer
  // caminho sem rota, entao um teste que so olha o status continuaria verde
  // com a API inteira desmontada.
  it('404 em tamanho que o produto nao tem, e sem marcar o produto', async () => {
    await env.DB.prepare(`UPDATE produtos SET atualizado_em = '2000-01-01 00:00:00' WHERE id = 'top-tanga-sand'`).run()

    const r = await patch('/api/produtos/top-tanga-sand/tamanhos/XG', { disponivel: false })
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({ erro: 'tamanho nao encontrado' })

    // 404 nao pode deixar rastro: o produto existe, o tamanho nao.
    const linha = await env.DB.prepare(`SELECT atualizado_em FROM produtos WHERE id = 'top-tanga-sand'`).first<{ atualizado_em: string }>()
    expect(linha?.atualizado_em).toBe('2000-01-01 00:00:00')
  })

  it('404 em produto inexistente', async () => {
    const r = await patch('/api/produtos/nao-existe/tamanhos/M', { disponivel: false })
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({ erro: 'tamanho nao encontrado' })
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

  it('atualiza atualizado_em do produto', async () => {
    await env.DB.prepare(`UPDATE produtos SET atualizado_em = '2000-01-01 00:00:00' WHERE id = 'top-tanga-sand'`).run()
    await patch('/api/produtos/top-tanga-sand', { temKids: false })
    const linha = await env.DB.prepare(`SELECT atualizado_em FROM produtos WHERE id = 'top-tanga-sand'`).first<{ atualizado_em: string }>()
    expect(linha?.atualizado_em).not.toBe('2000-01-01 00:00:00')
  })

  it('404 em produto inexistente', async () => {
    const r = await patch('/api/produtos/nao-existe', { temKids: true })
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({ erro: 'produto nao encontrado' })
  })

  it('400 em campo a mais: erro de digitacao nao vira toque silencioso', async () => {
    const r = await patch('/api/produtos/top-tanga-sand', { temKids: false, disponivel: true })
    expect(r.status).toBe(400)
  })

  it('400 em corpo invalido', async () => {
    expect((await patch('/api/produtos/top-tanga-sand', { temKids: 1 })).status).toBe(400)
  })
})
