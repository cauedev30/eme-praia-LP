import { afterEach, describe, expect, it, vi } from 'vitest'
import { carregarCatalogo, temEstoque } from '@/lib/catalogo'
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

const categoriaValida = { id: 'biquinis', slug: 'biquinis', nome: 'Biquínis', imagem: '', ordem: 1, ativo: true }

function fetchQueResponde(status: number, corpo: unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch
}

describe('carregarCatalogo', () => {
  afterEach(() => vi.restoreAllMocks())

  it('exige API_URL', async () => {
    // '' e nao undefined: undefined cairia no default do parametro
    // (process.env.API_URL) e o teste dependeria do ambiente.
    await expect(carregarCatalogo(fetchQueResponde(200, {}), '')).rejects.toThrow(/API_URL/)
  })

  it('falha se a API nao responder 200', async () => {
    await expect(carregarCatalogo(fetchQueResponde(500, {}), 'http://api')).rejects.toThrow(/500/)
  })

  it('falha se o corpo nao for o envelope', async () => {
    await expect(carregarCatalogo(fetchQueResponde(200, { produtos: 'x' }), 'http://api')).rejects.toThrow()
  })

  it('falha com zero produtos validos', async () => {
    await expect(
      carregarCatalogo(fetchQueResponde(200, { categorias: [categoriaValida], produtos: [] }), 'http://api'),
    ).rejects.toThrow(/zero produtos/)
  })

  it('pula produto invalido com aviso e mantem os outros', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const corpo = {
      categorias: [categoriaValida],
      produtos: [
        { ...base, id: 'ok', slug: 'ok', ordem: 2 },
        { ...base, id: 'quebrado', slug: 'quebrado', precoCentavos: 149.9, ordem: 1 },
      ],
    }
    const { produtos } = await carregarCatalogo(fetchQueResponde(200, corpo), 'http://api')
    expect(produtos.map((p) => p.slug)).toEqual(['ok'])
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('quebrado'), expect.anything())
  })

  it('pula produto cuja categoria nao veio, com aviso', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const corpo = {
      categorias: [categoriaValida],
      produtos: [{ ...base, id: 'orfao', slug: 'orfao', categoria: 'chapeus' }, { ...base, id: 'ok', slug: 'ok' }],
    }
    const { produtos } = await carregarCatalogo(fetchQueResponde(200, corpo), 'http://api')
    expect(produtos.map((p) => p.slug)).toEqual(['ok'])
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('orfao'))
  })

  it('pula produto de categoria inativa', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const corpo = {
      categorias: [categoriaValida, { ...categoriaValida, id: 'maio', slug: 'maio', ordem: 2, ativo: false }],
      produtos: [{ ...base, id: 'm', slug: 'm', categoria: 'maio' }, { ...base, id: 'ok', slug: 'ok' }],
    }
    const { produtos } = await carregarCatalogo(fetchQueResponde(200, corpo), 'http://api')
    expect(produtos.map((p) => p.slug)).toEqual(['ok'])
  })

  it('falha se so sobrar produto arquivado', async () => {
    const corpo = { categorias: [categoriaValida], produtos: [{ ...base, ativo: false }] }
    await expect(carregarCatalogo(fetchQueResponde(200, corpo), 'http://api')).rejects.toThrow(/zero produtos/)
  })

  it('filtra inativos e ordena por ordem', async () => {
    const corpo = {
      categorias: [categoriaValida, { ...categoriaValida, id: 'maio', slug: 'maio', ordem: 2, ativo: false }],
      produtos: [
        { ...base, id: 'b', slug: 'b', ordem: 2 },
        { ...base, id: 'a', slug: 'a', ordem: 1 },
        { ...base, id: 'c', slug: 'c', ordem: 3, ativo: false },
      ],
    }
    const { categorias, produtos } = await carregarCatalogo(fetchQueResponde(200, corpo), 'http://api')
    expect(categorias.map((c) => c.slug)).toEqual(['biquinis'])
    expect(produtos.map((p) => p.slug)).toEqual(['a', 'b'])
  })

  it('aceita API_URL com barra no fim', async () => {
    const f = fetchQueResponde(200, { categorias: [categoriaValida], produtos: [base] })
    await carregarCatalogo(f, 'http://api/')
    expect(f).toHaveBeenCalledWith('http://api/api/catalogo.json')
  })
})
