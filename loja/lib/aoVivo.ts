import type { MapaDisponibilidade, Produto } from '@/lib/tipos'

// Mescla o produto do build com o mapa de disponibilidade buscado no
// navegador. Regras:
//  - sem entrada no mapa: vale o build (fetch falhou, ou produto novo)
//  - a grade (quais tamanhos existem) e do build; o mapa so diz sim/nao
//  - temKids tambem vem do mapa, pra chave da Mayara aparecer sem rebuild

export function aoVivo(produto: Produto, mapa: MapaDisponibilidade): Produto {
  const vivo = mapa[produto.slug]
  if (!vivo) return produto
  return {
    ...produto,
    temKids: vivo.temKids,
    tamanhos: produto.tamanhos.map((t) =>
      t.tamanho in vivo.tamanhos ? { ...t, disponivel: vivo.tamanhos[t.tamanho] } : t,
    ),
  }
}
