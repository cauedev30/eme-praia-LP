import { describe, expect, it } from 'vitest'
import { aoVivo, selecaoCorrigida } from '@/lib/aoVivo'
import type { MapaDisponibilidade, Produto } from '@/lib/tipos'

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

  it('entrada torta no mapa nao derruba a pagina: vale o build', () => {
    const tortos = [null, undefined, {}, { temKids: true }, { temKids: true, tamanhos: null }]
    for (const torto of tortos) {
      const vivo = aoVivo(produto, { x: torto } as unknown as MapaDisponibilidade)
      expect(vivo).toBe(produto)
    }
  })
})

describe('selecaoCorrigida', () => {
  it('sem selecao continua sem selecao', () => {
    expect(selecaoCorrigida(produto, undefined)).toBeUndefined()
  })

  it('tamanho que continua disponivel fica', () => {
    expect(selecaoCorrigida(produto, 'M')).toBe('M')
  })

  it('tamanho que esgotou e LIMPO, nunca trocado por outro', () => {
    const esgotouM = {
      ...produto,
      tamanhos: [
        { tamanho: 'P', disponivel: true },
        { tamanho: 'M', disponivel: false },
      ],
    }
    // P segue disponivel: se trocasse em vez de limpar, isso viria 'P' e a
    // cliente mandaria no WhatsApp um tamanho que nao escolheu.
    expect(selecaoCorrigida(esgotouM, 'M')).toBeUndefined()
  })

  it('kids selecionado some quando o produto perde a linha kids', () => {
    expect(selecaoCorrigida({ ...produto, temKids: false }, 'Kids 6')).toBeUndefined()
  })

  it('kids selecionado fica enquanto o produto tem a linha kids', () => {
    expect(selecaoCorrigida(produto, 'Kids 6')).toBe('Kids 6')
  })

  it('tamanho fora da grade fica como esta: nao e papel dela limpar', () => {
    expect(selecaoCorrigida(produto, 'XG')).toBe('XG')
  })
})
