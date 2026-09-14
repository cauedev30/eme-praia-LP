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
  /** A mesma peca tambem sai em tamanho kids, sob encomenda. A grade kids
   *  e fixa (loja.config.ts -> gradeKids) e nunca esgota — por isso nao
   *  entra em `tamanhos`. */
  temKids: boolean
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

/** O que muda varias vezes por dia e o site busca em runtime
 *  (GET /api/disponibilidade.json, decisao 3). Chave: slug do produto.
 *  So produtos ativos. Carrega temKids porque a chave da Mayara tambem
 *  precisa aparecer sem rebuild. */
/** O valor e `| undefined` de proposito: a pagina do produto e estatica, do
 *  build, e o mapa vem do banco agora. Produto arquivado depois do build
 *  ainda tem pagina e nao esta mais no mapa — quem indexa aqui tem que
 *  tratar a falta em vez de o TypeScript prometer que ela nao acontece. */
export type MapaDisponibilidade = Record<
  string,
  | {
      temKids: boolean
      tamanhos: Record<string, boolean>
    }
  | undefined
>
