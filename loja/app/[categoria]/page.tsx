import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategoria, getCategorias, getProdutosPorCategoria } from '@/lib/catalogo'
import { jsonLdListaProdutos, ScriptJsonLd } from '@/lib/jsonld'
import { loja } from '@/loja.config'
import ProductCard from '@/components/ProductCard'
import BackButton from '@/components/BackButton'

type Props = { params: { categoria: string } }

// Substitui as pastas fixas app/biquinis, app/maio e app/acessorios. Categoria
// nova passa a ser uma linha no banco, nao uma pasta nova no codigo.
export async function generateStaticParams() {
  const categorias = await getCategorias()
  return categorias.map((categoria) => ({ categoria: categoria.slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const categoria = await getCategoria(params.categoria)
  if (!categoria) return {}

  return {
    title: `${categoria.nome} — ${loja.nome}`,
    description: `${categoria.nome} da ${loja.nome}. Peça pelo WhatsApp.`,
    alternates: { canonical: `/${categoria.slug}` },
  }
}

export default async function CategoriaPage({ params }: Props) {
  const categoria = await getCategoria(params.categoria)
  if (!categoria) notFound()

  const produtos = await getProdutosPorCategoria(categoria.slug)

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <ScriptJsonLd dados={jsonLdListaProdutos(produtos, categoria.nome)} />
      <BackButton />
      <h1 className="mb-8 font-serif text-3xl">{categoria.nome}</h1>

      {produtos.length === 0 ? (
        <p className="py-16 text-center text-sm text-carvao/60">
          Ainda não temos peças nessa categoria. Volte em breve.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {produtos.map((produto) => (
            <ProductCard key={produto.id} produto={produto} />
          ))}
        </div>
      )}
    </main>
  )
}
