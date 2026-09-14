import type { Categoria, Produto, Tamanho } from '../lib/tipos'

// Leitura do catalogo no D1, no formato exato de lib/tipos.ts. E o unico
// lugar do Worker da loja que fala SQL. Nada aqui escreve.

type LinhaCategoria = {
  id: string
  slug: string
  nome: string
  imagem: string
  ordem: number
  ativo: number
}

type LinhaProduto = {
  id: string
  slug: string
  nome: string
  descricao: string
  categoria: string
  preco_centavos: number
  preco_pix_centavos: number
  imagens: string
  tem_kids: number
  ordem: number
  ativo: number
}

type LinhaTamanho = {
  produto_id: string
  tamanho: string
  disponivel: number
}

const SQL_CATEGORIAS = `
  SELECT id, slug, nome, imagem, ordem, ativo
  FROM categorias
  WHERE ativo = 1
  ORDER BY ordem`

// Produto ativo em categoria ativa. A categoria sai pelo slug, que e o que
// tipos.ts espera em Produto.categoria.
const SQL_PRODUTOS = `
  SELECT p.id, p.slug, p.nome, p.descricao, c.slug AS categoria,
         p.preco_centavos, p.preco_pix_centavos, p.imagens, p.tem_kids,
         p.ordem, p.ativo
  FROM produtos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE p.ativo = 1 AND c.ativo = 1
  ORDER BY p.ordem`

const SQL_TAMANHOS = `
  SELECT produto_id, tamanho, disponivel
  FROM tamanhos
  ORDER BY produto_id, ordem`

const bool = (v: number) => v === 1

// Guard contra imagens gravadas fora do formato esperado (lista de string):
// se o JSON nao for array, cai pra lista vazia em vez de vazar o tipo errado
// pra tipos.ts.
function paraListaDeImagens(json: string): string[] {
  const valor = JSON.parse(json) as unknown
  return Array.isArray(valor) ? (valor as string[]) : []
}

export async function lerCatalogo(db: D1Database): Promise<{ categorias: Categoria[]; produtos: Produto[] }> {
  const [cats, prods, tams] = await db.batch([
    db.prepare(SQL_CATEGORIAS),
    db.prepare(SQL_PRODUTOS),
    db.prepare(SQL_TAMANHOS),
  ])

  const tamanhosPorProduto = new Map<string, Tamanho[]>()
  for (const t of tams.results as LinhaTamanho[]) {
    const lista = tamanhosPorProduto.get(t.produto_id) ?? []
    lista.push({ tamanho: t.tamanho, disponivel: bool(t.disponivel) })
    tamanhosPorProduto.set(t.produto_id, lista)
  }

  const categorias: Categoria[] = (cats.results as LinhaCategoria[]).map((c) => ({
    id: c.id,
    slug: c.slug,
    nome: c.nome,
    imagem: c.imagem,
    ordem: c.ordem,
    ativo: bool(c.ativo),
  }))

  const produtos: Produto[] = (prods.results as LinhaProduto[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    nome: p.nome,
    descricao: p.descricao,
    categoria: p.categoria,
    precoCentavos: p.preco_centavos,
    precoPixCentavos: p.preco_pix_centavos,
    imagens: paraListaDeImagens(p.imagens),
    tamanhos: tamanhosPorProduto.get(p.id) ?? [],
    temKids: bool(p.tem_kids),
    ordem: p.ordem,
    ativo: bool(p.ativo),
  }))

  return { categorias, produtos }
}
