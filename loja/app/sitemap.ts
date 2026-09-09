import type { MetadataRoute } from 'next'
import { getCategorias, getProdutos } from '@/lib/catalogo'
import { loja } from '@/loja.config'

export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categorias, produtos] = await Promise.all([getCategorias(), getProdutos()])

  return [
    { url: loja.dominio, changeFrequency: 'weekly', priority: 1 },
    ...categorias.map((categoria) => ({
      url: `${loja.dominio}/${categoria.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...produtos.map((produto) => ({
      url: `${loja.dominio}/produto/${produto.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}
