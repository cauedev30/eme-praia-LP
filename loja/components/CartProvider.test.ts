import { describe, expect, it } from 'vitest'
import { chaveDoItem, montarMensagem, type ItemSacola } from '@/components/CartProvider'

const item = (extra: Partial<ItemSacola>): ItemSacola => ({
  produtoId: 'top-tanga-sand',
  slug: 'top-tanga-sand',
  nome: 'Top Meia Taca + Tanga Lateral Sand',
  precoPixCentavos: 23800,
  quantidade: 1,
  ...extra,
})

describe('chaveDoItem', () => {
  it('adulto e kids do mesmo produto sao itens diferentes na sacola', () => {
    expect(chaveDoItem(item({ tamanho: 'M' }))).not.toBe(chaveDoItem(item({ tamanho: 'Kids 6' })))
  })
})

describe('montarMensagem', () => {
  it('o tamanho kids sai como "Tamanho Kids 6" pra Mayara ler certo', () => {
    const mensagem = montarMensagem([item({ tamanho: 'Kids 6' })], 23800)
    expect(mensagem).toContain('Tamanho Kids 6 · Qtd 1')
    expect(mensagem).toContain('/produto/top-tanga-sand')
  })
})
