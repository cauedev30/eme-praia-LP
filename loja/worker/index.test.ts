import { env, exports } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'

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
    // Nao basta o status: o notFound padrao do Hono tambem devolve 404. O
    // que prova o fallthrough pro ASSETS (com not_found_handling:
    // "404-page") e o corpo vir da 404.html real, nao de um texto do Hono.
    expect(resposta.headers.get('content-type')).toContain('text/html')
    expect(await resposta.text()).toContain('</html>')
  })

  it('erro no banco devolve 500 com { erro }', async () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => {})

    // tamanhos tem FOREIGN KEY pra produtos (0001_catalogo.sql); com o
    // constraint ligado (padrao do D1), dropar produtos sozinho falha antes
    // do fetch. Dropa tamanhos primeiro pra so entao derrubar produtos.
    await env.DB.prepare('DROP TABLE tamanhos').run()
    await env.DB.prepare('DROP TABLE produtos').run()
    const resposta = await exports.default.fetch('https://eme-praia.test/api/catalogo.json')

    expect(resposta.status).toBe(500)
    expect(await resposta.json()).toEqual({ erro: 'falha ao ler o banco' })
    expect(espiao).toHaveBeenCalled()

    espiao.mockRestore()
  })
})

describe('GET /api/disponibilidade.json', () => {
  it('devolve o mapa com 30 s de cache', async () => {
    const r = await exports.default.fetch('https://eme-praia.test/api/disponibilidade.json')
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('public, max-age=30, s-maxage=30')

    const mapa = (await r.json()) as Record<string, { temKids: boolean; tamanhos: Record<string, boolean> }>
    expect(Object.keys(mapa)).toHaveLength(17)
    // A forma importa: e o contrato que o DisponibilidadeProvider consome.
    expect(mapa['top-tanga-sand']).toEqual({
      temKids: true,
      tamanhos: { P: true, M: true, G: true, GG: true },
    })
  })

  // O teste acima nao prova o filtro de ativos: o seed nao tem produto
  // arquivado, entao apagar o WHERE ainda daria 17. Este prova.
  it('produto arquivado sai do mapa', async () => {
    await env.DB.prepare(`UPDATE produtos SET ativo = 0 WHERE id = 'top-tanga-sand'`).run()

    const r = await exports.default.fetch('https://eme-praia.test/api/disponibilidade.json')
    const mapa = (await r.json()) as Record<string, unknown>

    expect(mapa['top-tanga-sand']).toBeUndefined()
    expect(Object.keys(mapa)).toHaveLength(16)
  })
})
