import type { Produto } from '@/lib/tipos'
import { loja } from '@/loja.config'

// O que a cliente escolhe antes de por na sacola. Duas fontes:
//  - grade adulto, por produto, com esgotado por tamanho (produto.tamanhos)
//  - grade kids, fixa na loja, sob encomenda, nunca esgota (loja.gradeKids)
// A selecao e UMA string: 'M' ou 'Kids 6'. E o que vai pra sacola e pro
// WhatsApp, entao o prefixo e parte do dado, nao so da tela.

const PREFIXO_KIDS = 'Kids '

export function rotuloKids(tamanho: string) {
  return `${PREFIXO_KIDS}${tamanho}`
}

export function tamanhosKids(produto: Produto): string[] {
  return produto.temKids ? [...loja.gradeKids] : []
}

export function temVariante(produto: Produto) {
  return produto.tamanhos.length > 0 || produto.temKids
}

/** Primeiro adulto disponivel. Kids nunca e pre-selecionado: se so sobrou
 *  kids, a cliente clica — e uma escolha que ela precisa fazer de olho aberto. */
export function selecaoInicial(produto: Produto): string | undefined {
  return produto.tamanhos.find((t) => t.disponivel)?.tamanho
}
