import { describe, expect, it } from 'vitest'
import { temEstoque } from '@/lib/estoque'
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

describe('temEstoque', () => {
  it('sem grade e sem kids: sempre a venda', () => {
    expect(temEstoque(base)).toBe(true)
  })

  it('adulto todo esgotado e sem kids: esgotado', () => {
    const p = { ...base, tamanhos: [{ tamanho: 'M', disponivel: false }] }
    expect(temEstoque(p)).toBe(false)
  })

  it('adulto todo esgotado mas com kids: a venda (kids e sob encomenda)', () => {
    const p = { ...base, tamanhos: [{ tamanho: 'M', disponivel: false }], temKids: true }
    expect(temEstoque(p)).toBe(true)
  })

  it('um adulto disponivel: a venda', () => {
    const p = {
      ...base,
      tamanhos: [
        { tamanho: 'P', disponivel: false },
        { tamanho: 'M', disponivel: true },
      ],
    }
    expect(temEstoque(p)).toBe(true)
  })
})
