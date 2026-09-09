// Formato do catalogo. Vale tanto pra Fase 0 (dados em arquivo) quanto pra
// Fase 1 (dados vindos do D1) — por isso espelha o schema do banco.

export type Tamanho = {
  tamanho: string
  /** Disponibilidade e booleana, nunca quantidade: a venda acontece no
   *  WhatsApp e o site nunca fica sabendo dela. Numero de estoque estaria
   *  errado em 20 minutos. */
  disponivel: boolean
}

export type Produto = {
  id: string
  /** Congelado na criacao e imutavel. Se seguisse o nome, cada renomeacao
   *  pela Mayara viraria link morto e ranking perdido. */
  slug: string
  nome: string
  descricao: string
  /** slug da categoria */
  categoria: string
  /** Precos em centavos (inteiro). Float em coluna de dinheiro vira
   *  R$ 149,899999 mais cedo ou mais tarde. */
  precoCentavos: number
  precoPixCentavos: number
  /** A primeira e a principal. */
  imagens: string[]
  /** Vazio = produto sem grade de tamanho. */
  tamanhos: Tamanho[]
  ordem: number
  ativo: boolean
}

export type Categoria = {
  id: string
  slug: string
  nome: string
  imagem: string
  ordem: number
  ativo: boolean
}
