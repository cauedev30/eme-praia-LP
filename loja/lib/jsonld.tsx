import { loja } from '@/loja.config'
import { temEstoque } from '@/lib/estoque'
import { urlAbsoluta } from '@/lib/loja'
import type { Produto } from '@/lib/tipos'

// Dados estruturados pro Google. A loja e so online, entao usamos OnlineStore
// e NAO schema.org/Store com endereco — nao ha ponto fisico pra ranquear.

export function jsonLdLoja() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: loja.nome,
    description: loja.descricao,
    url: loja.dominio,
    sameAs: [loja.instagram],
  }
}

export function jsonLdProduto(produto: Produto) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: produto.nome,
    description: produto.descricao || produto.nome,
    // `image` vazio e invalido no schema.org: melhor omitir do que mandar [].
    ...(produto.imagens.length ? { image: produto.imagens.map(urlAbsoluta) } : {}),
    sku: produto.slug,
    offers: {
      '@type': 'Offer',
      url: urlAbsoluta(`/produto/${produto.slug}`),
      priceCurrency: 'BRL',
      price: (produto.precoPixCentavos / 100).toFixed(2),
      // Vale o estado do build. O overlay corrige no navegador; o Google
      // tolera a divergencia e nao ha feed de Merchant Center no jogo.
      availability: temEstoque(produto)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }
}

export function jsonLdListaProdutos(produtos: Produto[], nomeDaLista: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: nomeDaLista,
    numberOfItems: produtos.length,
    itemListElement: produtos.map((produto, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: urlAbsoluta(`/produto/${produto.slug}`),
      name: produto.nome,
    })),
  }
}

/** Componente pra injetar o JSON-LD na pagina. */
export function ScriptJsonLd({ dados }: { dados: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados) }}
    />
  )
}
