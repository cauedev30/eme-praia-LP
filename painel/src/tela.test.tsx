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
    // Com o checked de propria: o outro teste prova que ele some quando
    // tem_kids = 0, mas sem este a chave podia nascer sempre desmarcada e
    // os dois passariam.
    expect(html).toMatch(/data-kids="top-tanga-sand"[^>]*checked/)
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

  it('categoria que ficou sem produto ativo nao vira titulo solto', async () => {
    await env.DB.prepare(
      `UPDATE produtos SET ativo = 0 WHERE categoria_id = (SELECT id FROM categorias WHERE slug = 'maio')`,
    ).run()
    const html = await (await abrirPainel()).text()
    expect(html).not.toContain('<h2>Maiô</h2>')
    expect(html).toContain('<h2>Biquínis</h2>')
  })

  it('produto sem foto mostra o slot, nao um img quebrado', async () => {
    const html = await (await abrirPainel()).text()
    expect(html).toContain('class="foto vazia"')
    expect(html).not.toContain('<img')
  })

  it('produto com foto mostra a foto, com o endereco da loja na frente', async () => {
    await env.DB.prepare(
      `UPDATE produtos SET imagens = '["/produtos/sand.webp"]' WHERE id = 'top-tanga-sand'`,
    ).run()

    const r = await app.request(
      '/',
      { headers: await comSessao() },
      { ...ambiente(), URL_LOJA: 'https://eme-praia.exemplo' },
    )
    const html = await r.text()
    expect(html).toContain('src="https://eme-praia.exemplo/produtos/sand.webp"')
  })

  it('sem URL_LOJA, cai no slot em vez de pedir um caminho que nao resolve', async () => {
    await env.DB.prepare(
      `UPDATE produtos SET imagens = '["/produtos/sand.webp"]' WHERE id = 'top-tanga-sand'`,
    ).run()

    const html = await (await abrirPainel()).text()
    expect(html).not.toContain('<img')
    expect(html).toContain('class="foto vazia"')
  })

  it('endereco absoluto no banco passa direto, sem prefixo duplicado', async () => {
    await env.DB.prepare(
      `UPDATE produtos SET imagens = '["https://cdn.exemplo/sand.webp"]' WHERE id = 'top-tanga-sand'`,
    ).run()

    const r = await app.request(
      '/',
      { headers: await comSessao() },
      { ...ambiente(), URL_LOJA: 'https://eme-praia.exemplo' },
    )
    expect(await r.text()).toContain('src="https://cdn.exemplo/sand.webp"')
  })

  it('escapa HTML no nome do produto', async () => {
    await env.DB.prepare(`UPDATE produtos SET nome = 'Top <b>x</b>' WHERE id = 'top-tanga-sand'`).run()
    const html = await (await abrirPainel()).text()
    expect(html).toContain('Top &lt;b&gt;x&lt;/b&gt;')
  })
})
