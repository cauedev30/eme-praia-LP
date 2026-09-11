// Configuracao da loja. E o unico arquivo que muda de cliente pra cliente —
// o resto do codigo e generico. Ver docs/runbook-caue.md.

export const loja = {
  nome: 'Eme Praia',
  descricao: 'Moda praia — biquínis e maiôs, com linha kids sob encomenda.',

  // TODO(Cauê): confirmar com a Mayara antes do lancamento.
  dominio: 'https://emepraia.com.br',
  whatsapp: '5583000000000',
  instagram: 'https://www.instagram.com/emepraia/',

  // Loja so online, sem ponto fisico — por isso nao ha SEO local nem
  // schema.org/Store com endereco. Ver o plano do projeto.
  temPontoFisico: false,

  // Grade sugerida no painel ao cadastrar produto. A grade adulto real e por
  // produto (fica em produto.tamanhos), isso aqui e so o pre-preenchimento.
  gradesSugeridas: {
    adulto: ['P', 'M', 'G', 'GG'],
  },

  // Grade kids. Fixa pra loja inteira: a peca e sob encomenda, entao todo
  // produto com `temKids` oferece estes tamanhos e nenhum deles esgota.
  // Confirmar com a Mayara antes do lancamento — 4 a 12 e hipotese do Caue.
  gradeKids: ['4', '6', '8', '10', '12'],

  parcelasMaximas: 3,
} as const
