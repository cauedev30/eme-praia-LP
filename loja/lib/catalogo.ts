import { produtos as produtosArquivo } from '@/data/produtos'
import { categorias as categoriasArquivo } from '@/data/categorias'
import type { Categoria, Produto } from '@/lib/tipos'

// A FRONTEIRA DO CATALOGO.
//
// Fase 0: os dados vem de arquivo (data/*.ts).
// Fase 1: viram um fetch em /api/catalogo.json servido pelo Worker sobre D1.
//
// Todo o site fala com o catalogo atraves destas funcoes, entao a troca de
// fonte acontece SO neste arquivo. E por isso que elas ja sao async: a
// assinatura nao muda quando o banco entrar.

const ativos = <T extends { ativo: boolean; ordem: number }>(lista: T[]) =>
  lista.filter((i) => i.ativo).sort((a, b) => a.ordem - b.ordem)

export async function getCategorias(): Promise<Categoria[]> {
  return ativos(categoriasArquivo)
}

export async function getCategoria(slug: string): Promise<Categoria | undefined> {
  return (await getCategorias()).find((c) => c.slug === slug)
}

export async function getProdutos(): Promise<Produto[]> {
  return ativos(produtosArquivo)
}

export async function getProduto(slug: string): Promise<Produto | undefined> {
  return (await getProdutos()).find((p) => p.slug === slug)
}

export async function getProdutosPorCategoria(slug: string): Promise<Produto[]> {
  return (await getProdutos()).filter((p) => p.categoria === slug)
}

/** Um produto so esta a venda se tiver ao menos um tamanho disponivel.
 *  Produto sem grade (tamanhos vazio) esta sempre disponivel. Produto com
 *  kids tambem: kids e sob encomenda e nunca esgota. */
export function temEstoque(produto: Produto) {
  return (
    produto.temKids ||
    produto.tamanhos.length === 0 ||
    produto.tamanhos.some((t) => t.disponivel)
  )
}
