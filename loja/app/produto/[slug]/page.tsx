import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProduto, getProdutos } from '@/lib/catalogo'
import { jsonLdProduto, ScriptJsonLd } from '@/lib/jsonld'
import { formatarCentavos } from '@/lib/preco'
import { loja } from '@/loja.config'
import ProductDetail from '@/components/ProductDetail'

type Props = { params: { slug: string } }

export async function generateStaticParams() {
  const produtos = await getProdutos()
  return produtos.map((produto) => ({ slug: produto.slug }))
}

export const dynamicParams = false

// Sem isso as 50+ paginas de produto dividem o mesmo <title> e a loja some do
// Google. E o item de maior impacto de SEO do projeto.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const produto = await getProduto(params.slug)
  if (!produto) return {}

  const descricao =
    produto.descricao ||
    `${produto.nome} por ${formatarCentavos(produto.precoPixCentavos)} no Pix. Peça pelo WhatsApp.`

  return {
    title: `${produto.nome} — ${loja.nome}`,
    description: descricao,
    alternates: { canonical: `/produto/${produto.slug}` },
    openGraph: {
      title: produto.nome,
      description: descricao,
      images: produto.imagens,
      type: 'website',
    },
  }
}

export default async function ProdutoPage({ params }: Props) {
  const produto = await getProduto(params.slug)
  if (!produto) notFound()

  return (
    <>
      <ScriptJsonLd dados={jsonLdProduto(produto)} />
      <ProductDetail produto={produto} />
    </>
  )
}
