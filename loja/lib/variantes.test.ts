import { describe, expect, it } from 'vitest'
import { rotuloKids, selecaoInicial, tamanhosKids, temVariante } from '@/lib/variantes'
import type { Produto } from '@/lib/tipos'

const base: Produto = {
  id: 'x',
  slug: 'x',
  nome: 'X',
  descricao: '',
  categoria: 'biquinis',
  precoCentavos: 10000,
  precoPixCentavos: 9000,
  imagens: [],
  tamanhos: [],
  temKids: false,
  ordem: 1,
  ativo: true,
}

describe('rotuloKids', () => {
  it('prefixa com "Kids " pra Mayara ler certo no pedido', () => {
    expect(rotuloKids('6')).toBe('Kids 6')
  })
})

describe('tamanhosKids', () => {
  it('vazio quando o produto nao tem kids', () => {
    expect(tamanhosKids(base)).toEqual([])
  })

  it('a grade fixa da loja quando tem kids', () => {
    expect(tamanhosKids({ ...base, temKids: true })).toEqual(['4', '6', '8', '10', '12'])
  })
})

describe('temVariante', () => {
  it('falso sem grade e sem kids', () => {
    expect(temVariante(base)).toBe(false)
  })

  it('verdadeiro so com kids', () => {
    expect(temVariante({ ...base, temKids: true })).toBe(true)
  })

  it('verdadeiro so com grade adulto', () => {
    expect(temVariante({ ...base, tamanhos: [{ tamanho: 'M', disponivel: false }] })).toBe(true)
  })
})

describe('selecaoInicial', () => {
  it('primeiro adulto disponivel', () => {
    const p = {
      ...base,
      tamanhos: [
        { tamanho: 'P', disponivel: false },
        { tamanho: 'M', disponivel: true },
        { tamanho: 'G', disponivel: true },
      ],
    }
    expect(selecaoInicial(p)).toBe('M')
  })

  it('adulto todo esgotado com kids: nada pre-selecionado, a cliente escolhe', () => {
    const p = { ...base, tamanhos: [{ tamanho: 'M', disponivel: false }], temKids: true }
    expect(selecaoInicial(p)).toBeUndefined()
  })

  it('sem grade adulto: nada pre-selecionado', () => {
    expect(selecaoInicial({ ...base, temKids: true })).toBeUndefined()
  })
})
