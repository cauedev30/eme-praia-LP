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
