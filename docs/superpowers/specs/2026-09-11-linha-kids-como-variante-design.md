# Linha Kids vira variante do produto, não categoria

Data: 2026-09-11 · Estado: aprovado pelo Cauê

## O problema

A Linha Kids existe hoje como categoria própria (`linha-kids`), vazia. Mas a
Eme Praia trabalha sob encomenda: o mesmo biquíni que a Mayara faz em adulto
ela faz em kids. Uma categoria separada obrigaria a cadastrar cada peça duas
vezes e manter duas grades. A informação certa é "esta peça também sai em
kids", e isso é um atributo do produto.

## Decisão

- A categoria `linha-kids` é **removida**. O site fica com Biquínis e Maiô.
- `Produto` ganha `temKids: boolean`. É uma chave por produto, ligada por
  padrão nas fixtures. No painel (Fase 3) vira um toggle no cadastro.
- Os tamanhos kids são **fixos e globais**, definidos em
  `loja.config.ts` → `gradesSugeridas.kids`: `['4', '6', '8', '10', '12']`.
  Não entram em `produto.tamanhos`.
- Kids **nunca esgota**. É sob encomenda, então não tem booleano de
  disponibilidade. Só a grade adulto tem.

Isso complementa a decisão 8 (grade por produto): a grade adulto continua por
produto; kids não é grade, é variante fixa da loja.

## Tela de produto (`components/ProductDetail.tsx`)

- Abaixo do bloco "Tamanho" adulto, quando `produto.temKids` é verdadeiro,
  aparece um segundo bloco com o rótulo **"Linha kids"** e os botões
  4 / 6 / 8 / 10 / 12, sempre habilitados.
- É **um seletor só**: selecionar um kids desmarca o adulto e vice-versa. O
  estado guarda uma string única no formato que vai pra sacola.
- A seleção inicial continua sendo o primeiro adulto disponível. Se não
  houver nenhum adulto disponível e `temKids` for verdadeiro, a seleção
  inicial fica vazia e o botão pede escolha (desabilitado até clicar).
- **"Esgotado" só considera a grade adulto**, mas um produto com todos os
  adultos esgotados e `temKids` ligado **não** mostra "Esgotado": os adultos
  aparecem riscados e o kids continua clicável e vendável.
- Produto sem grade adulto (`tamanhos: []`) e com `temKids` ligado mostra só o
  bloco kids.

## Sacola e WhatsApp

- O tamanho kids entra no item como `tamanho: 'Kids 6'` (prefixo literal
  `Kids ` mais o número). A chave de agrupamento já é `produtoId|tamanho`,
  então `CartProvider` não muda.
- A mensagem sai como `Tamanho Kids 6 · Qtd 1`, sem alteração em
  `montarMensagem`.

## Catálogo e config

- `data/categorias.ts`: remover a entrada `linha-kids`.
- `data/produtos.ts`: todos os 17 fixtures ganham `temKids: true`; o
  comentário sobre a Linha Kids nascer vazia sai.
- `loja.config.ts`: `descricao` vira `'Moda praia — biquínis e maiôs, com
  linha kids sob encomenda.'`; `gradesSugeridas.kids` vira
  `['4', '6', '8', '10', '12']`.
- `lib/catalogo.ts`: `temEstoque` passa a devolver verdadeiro também quando
  `produto.temKids` é verdadeiro (o card na vitrine não pode dizer esgotado
  se dá pra pedir kids).

## Fora do escopo

- Confirmar com a Mayara a grade kids (4–12 é a hipótese do Cauê).
- Painel de gestão. O toggle `temKids` nasce no dado; a tela é da Fase 3.
- Foto ou preço diferente pra kids. Mesma foto, mesmo preço.

## Verificação

1. Teste do seletor escrito antes do código: adulto e kids se excluem;
   adulto todo esgotado com kids ligado ainda permite adicionar; item vai
   pra sacola com `tamanho: 'Kids 6'`.
2. `npm run build` passa.
3. `out/linha-kids.html` não existe; `sitemap.xml` sem `/linha-kids`; menu
   sem "Linha Kids".
4. `docs/decisoes.md` ganha a nota na decisão 8; `docs/runbook-caue.md`
   atualiza a contagem de categorias sem foto (3 → 2).
