import { loja } from '@/loja.config'

/** Centavos -> "R$ 149,90". Toda exibicao de preco passa por aqui. */
export function formatarCentavos(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/** "3x de R$ 142,67" — derivado do preco no cartao, nunca escrito na mao. */
export function parcelamento(centavos: number, vezes = loja.parcelasMaximas) {
  return `${vezes}x de ${formatarCentavos(Math.ceil(centavos / vezes))}`
}
