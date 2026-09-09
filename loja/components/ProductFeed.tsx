import { getCategorias, getProdutos } from '@/lib/catalogo'
import type { Produto } from '@/lib/tipos'
import ProductCard from './ProductCard'

// o feed e o catalogo inteiro, intercalado — nao agrupado por categoria
function intercalar(filas: Produto[][]) {
  const saida: Produto[] = []
  for (let i = 0; filas.some((fila) => fila[i]); i++) {
    for (const fila of filas) if (fila[i]) saida.push(fila[i])
  }
  return saida
}

export default async function ProductFeed() {
  const [categorias, produtos] = await Promise.all([getCategorias(), getProdutos()])
  const itens = intercalar(
    categorias.map((categoria) => produtos.filter((p) => p.categoria === categoria.slug))
  )

  if (itens.length === 0) return null

  return (
    <section id="promocao" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-12">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">Promoção</h2>
        <span className="text-xs uppercase tracking-wide text-carvao/50">
          {itens.length} {itens.length === 1 ? 'peça' : 'peças'}
        </span>
      </div>
      {/* feed vertical: rola pra baixo, sem carrossel horizontal */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
        {itens.map((produto) => (
          <ProductCard key={produto.id} produto={produto} />
        ))}
      </div>
    </section>
  )
}
