import type { MapaDisponibilidade, Produto } from '@/lib/tipos'

// Mescla o produto do build com o mapa de disponibilidade buscado no
// navegador. Regras:
//  - sem entrada no mapa: vale o build (fetch falhou, ou produto novo)
//  - a grade (quais tamanhos existem) e do build; o mapa so diz sim/nao
//  - temKids tambem vem do mapa, pra chave da Mayara aparecer sem rebuild

export function aoVivo(produto: Produto, mapa: MapaDisponibilidade): Produto {
  const vivo = mapa[produto.slug]
  // A checagem de forma nao e paranoia gratuita: o mapa vem de um fetch, e
  // uma entrada torta faria o `in` abaixo derrubar a arvore inteira, que
  // nao tem error boundary. Na duvida, vale o build.
  if (
    !vivo ||
    typeof vivo.tamanhos !== 'object' ||
    vivo.tamanhos === null ||
    typeof vivo.temKids !== 'boolean'
  ) {
    return produto
  }
  return {
    ...produto,
    temKids: vivo.temKids,
    tamanhos: produto.tamanhos.map((t) =>
      t.tamanho in vivo.tamanhos ? { ...t, disponivel: vivo.tamanhos[t.tamanho] } : t,
    ),
  }
}

/** O que a selecao de tamanho deve virar quando o mapa chega e muda o
 *  produto debaixo da cliente. Devolve `undefined` pra limpar.
 *
 *  Limpa em vez de escolher outro de proposito: trocar em silencio faria
 *  ela mandar no WhatsApp um tamanho que nao escolheu. Sem selecao, a tela
 *  ja desabilita o botao e pede pra escolher, que e o estado honesto. */
export function selecaoCorrigida(produto: Produto, selecionado: string | undefined): string | undefined {
  if (!selecionado) return selecionado

  const kidsSumiu = selecionado.startsWith('Kids ') && !produto.temKids
  const adulto = produto.tamanhos.find((t) => t.tamanho === selecionado)
  if (kidsSumiu || (adulto && !adulto.disponivel)) return undefined

  return selecionado
}
