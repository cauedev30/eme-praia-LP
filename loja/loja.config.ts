// Configuracao da loja. E o unico arquivo que muda de cliente pra cliente —
// o resto do codigo e generico. Ver docs/runbook-caue.md.

export const loja = {
  nome: 'Eme Praia',
  descricao: 'Moda praia — biquínis, maiôs e linha kids.',

  // TODO(Cauê): confirmar com a Mayara antes do lancamento.
  dominio: 'https://emepraia.com.br',
  whatsapp: '5583000000000',
  instagram: 'https://www.instagram.com/emepraia/',

  // Loja so online, sem ponto fisico — por isso nao ha SEO local nem
  // schema.org/Store com endereco. Ver o plano do projeto.
  temPontoFisico: false,

  // Grades sugeridas no painel ao cadastrar produto. A grade real e por
  // produto (fica em produto.tamanhos), isso aqui e so o pre-preenchimento.
  gradesSugeridas: {
    adulto: ['P', 'M', 'G', 'GG'],
    kids: ['2', '4', '6', '8', '10'],
  },

  parcelasMaximas: 3,
} as const
