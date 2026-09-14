import { describe, expect, it } from 'vitest'
import { CatalogoSchema, CategoriaSchema, ProdutoSchema } from '@/lib/schema'

const produtoValido = {
  id: 'top-tanga-sand',
  slug: 'top-tanga-sand',
  nome: 'Top Meia Taça + Tanga Lateral Sand',
  descricao: '',
  categoria: 'biquinis',
  precoCentavos: 42800,
  precoPixCentavos: 23800,
  imagens: [],
  tamanhos: [{ tamanho: 'P', disponivel: true }],
  temKids: true,
  ordem: 1,
  ativo: true,
}

describe('ProdutoSchema', () => {
  it('aceita um produto no formato de tipos.ts', () => {
    expect(ProdutoSchema.safeParse(produtoValido).success).toBe(true)
  })

  it('recusa preco em float', () => {
    expect(ProdutoSchema.safeParse({ ...produtoValido, precoCentavos: 149.9 }).success).toBe(false)
  })

  it('recusa slug vazio ou com caractere fora de [a-z0-9-]', () => {
    expect(ProdutoSchema.safeParse({ ...produtoValido, slug: '' }).success).toBe(false)
    expect(ProdutoSchema.safeParse({ ...produtoValido, slug: 'Top Sand' }).success).toBe(false)
  })

  it('recusa tamanho sem booleano de disponibilidade', () => {
    expect(ProdutoSchema.safeParse({ ...produtoValido, tamanhos: [{ tamanho: 'P', disponivel: 1 }] }).success).toBe(false)
  })

  it('recusa campo faltando', () => {
    const semKids: Record<string, unknown> = { ...produtoValido }
    delete semKids.temKids
    expect(ProdutoSchema.safeParse(semKids).success).toBe(false)
  })
})

describe('CategoriaSchema', () => {
  it('aceita e recusa', () => {
    expect(CategoriaSchema.safeParse({ id: 'maio', slug: 'maio', nome: 'Maiô', imagem: '', ordem: 2, ativo: true }).success).toBe(true)
    expect(CategoriaSchema.safeParse({ id: 'maio', slug: 'maio', nome: '', imagem: '', ordem: 2, ativo: true }).success).toBe(false)
  })
})

describe('CatalogoSchema', () => {
  it('so exige o envelope; os itens sao validados um a um depois', () => {
    expect(CatalogoSchema.safeParse({ categorias: [], produtos: [{ qualquer: 'coisa' }] }).success).toBe(true)
    expect(CatalogoSchema.safeParse({ produtos: [] }).success).toBe(false)
    expect(CatalogoSchema.safeParse('texto').success).toBe(false)
  })
})
