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
