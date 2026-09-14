import type { Produto } from '@/lib/tipos'

// Logica pura, compartilhada por build e navegador.
//
// Fica fora de lib/catalogo.ts de proposito: aquele arquivo importa
// lib/schema.ts, que importa zod. Componente 'use client' que precisasse de
// temEstoque acabava levando o Zod inteiro pro bundle do navegador. Este
// arquivo nao pode importar lib/catalogo.ts nem lib/schema.ts.

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
