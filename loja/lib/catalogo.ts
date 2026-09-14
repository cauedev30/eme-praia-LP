import type { z } from 'zod'
import { CatalogoSchema, CategoriaSchema, ProdutoSchema } from '@/lib/schema'
import type { Categoria, Produto } from '@/lib/tipos'

// A FRONTEIRA DO CATALOGO.
//
// Fase 0: os dados vinham de arquivo (data/*.ts).
// Fase 1 (agora): vem de GET /api/catalogo.json, servido pelo Worker da loja
// sobre o D1. So o build chama isso; o HTML sai pronto.
//
// Todo o site fala com o catalogo atraves destas funcoes. As assinaturas nao
// mudaram na troca: e pra isso que elas ja eram async na Fase 0.
//
// Regras de falha (docs/runbook-caue.md):
//  - API fora, nao-200, JSON malformado  -> build FALHA. O deploy anterior fica.
//  - zero produtos validos               -> build FALHA. Nunca publicar loja vazia.
//  - um produto invalido                 -> pulado com console.warn. O resto builda.

type Catalogo = { categorias: Categoria[]; produtos: Produto[] }

const ativos = <T extends { ativo: boolean; ordem: number }>(lista: T[]) =>
  lista.filter((i) => i.ativo).sort((a, b) => a.ordem - b.ordem)

function validos<T>(itens: unknown[], schema: z.ZodType<T>, rotulo: string): T[] {
  const ok: T[] = []
  for (const item of itens) {
    const r = schema.safeParse(item)
    if (r.success) {
      ok.push(r.data)
    } else {
      const slug = (item as { slug?: unknown })?.slug
      console.warn(`catalogo: ${rotulo} pulado (${String(slug ?? '?')})`, r.error.issues)
    }
  }
  return ok
}

/** Le a API uma vez. Exportada pra teste; o site usa as funcoes get*. */
export async function carregarCatalogo(
  fetchImpl: typeof fetch = fetch,
  url: string | undefined = process.env.API_URL,
): Promise<Catalogo> {
  if (!url) {
    throw new Error(
      'API_URL nao definida. Copie loja/.env.example pra loja/.env.local e aponte pro Worker eme-praia.',
    )
  }
  const resposta = await fetchImpl(`${url.replace(/\/$/, '')}/api/catalogo.json`)
  if (!resposta.ok) {
    throw new Error(`catalogo: a API respondeu ${resposta.status} em ${url}. Build abortado.`)
  }
  const bruto = CatalogoSchema.parse(await resposta.json())

  const categorias = validos(bruto.categorias, CategoriaSchema, 'categoria')
  const slugsDeCategoria = new Set(categorias.map((c) => c.slug))
  const produtos = validos(bruto.produtos, ProdutoSchema, 'produto').filter((p) => {
    if (slugsDeCategoria.has(p.categoria)) return true
    console.warn(`catalogo: produto pulado (${p.slug}): categoria "${p.categoria}" nao existe`)
    return false
  })

  if (produtos.length === 0) {
    throw new Error('catalogo: zero produtos validos. Build abortado pra nao publicar loja vazia.')
  }

  return { categorias: ativos(categorias), produtos: ativos(produtos) }
}

// Uma leitura por build. O Next chama getProdutos() dezenas de vezes
// (generateStaticParams, cada pagina, sitemap); a API e lida uma vez so.
let emMemoria: Promise<Catalogo> | undefined
const catalogo = () => (emMemoria ??= carregarCatalogo())

export async function getCategorias(): Promise<Categoria[]> {
  return (await catalogo()).categorias
}

export async function getCategoria(slug: string): Promise<Categoria | undefined> {
  return (await getCategorias()).find((c) => c.slug === slug)
}

export async function getProdutos(): Promise<Produto[]> {
  return (await catalogo()).produtos
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
