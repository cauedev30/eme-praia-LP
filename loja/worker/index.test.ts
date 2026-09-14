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
