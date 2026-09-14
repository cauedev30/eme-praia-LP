# Decisões

Cada decisão com o motivo e o que ela custa. A parte que importa é a coluna
"por quê" — daqui a um ano, o "o quê" se lê no código, o "por quê" não.

---

## 1. O site é estático. Next.js não roda em servidor.

O build gera arquivos `.html` prontos e é isso que vai pro ar
(`output: 'export'`).

**Por quê.** Rodar Next.js na Cloudflare exige um adaptador, e o adaptador
recomendado mudou três vezes em 18 meses:

| Adaptador | Situação |
|---|---|
| `@cloudflare/next-on-pages` | Descontinuado, saiu da documentação |
| `@opennextjs/cloudflare` | Suporte ao Next 14 encerrado no Q1/2026 — a versão exata deste projeto |
| `vinext` | O atual. Beta, exige Next 16 |

Some a isso o limite de **10 ms de CPU por requisição** no plano grátis do
Workers: renderizar 50 produtos no servidor estoura e devolve erro. Já arquivo
estático na Cloudflare é grátis, ilimitado, e nem conta no limite de
requisições.

**O custo.** Mudança de conteúdo exige rebuild (~2 min). Foi por isso que a
disponibilidade de tamanho ficou de fora do HTML — ver decisão 3.

**Saída de emergência.** Se um dia precisar de servidor de verdade, a camada de
dados já é uma API HTTP. Troca-se quem consome o `/api/catalogo.json`, não a
arquitetura.

---

## 2. Disponibilidade é sim/não. Nunca quantidade.

Cada tamanho tem um booleano: disponível ou esgotado. Não existe "restam 3".

**Por quê.** O checkout acontece no WhatsApp. **O sistema nunca fica sabendo que
houve uma venda.** Um contador de estoque só estaria certo se alguém desse baixa
manualmente a cada pedido — o que não vai acontecer numa loja movimentada.
Número errado é pior que número nenhum: na segunda vez que o painel disser "3
disponíveis" e não tiver nenhum, a Mayara para de confiar nele e volta a mandar
áudio no WhatsApp. Aí o projeto inteiro perdeu a razão de existir.

**O custo.** Ninguém sabe quanto tem em estoque olhando o site. Não é o
problema que este projeto resolve.

---

## 3. Os dados são separados por frequência de mudança.

| Dado | Muda | Onde vive | Reflete em |
|---|---|---|---|
| Nome, preço, descrição, foto, categoria | Vezes por semana | HTML do build | ~2 min |
| **Disponibilidade por tamanho** | Várias vezes por dia | JSON buscado no navegador | ≤30 s, sem rebuild |

**Por quê.** A disponibilidade é o único dado que muda o tempo todo, e também o
único que o Google não precisa ver no HTML. Então é a única coisa que justifica
uma chamada em tempo real. Todo o resto pode ser arquivo.

**O custo.** O "esgotado" aparece uns 100 ms depois da página. No pior caso a
cliente pede um M que acabou — o que já acontece hoje, e a conversa resolve.

---

## 4. Preço é número inteiro, em centavos.

`R$ 149,90` é gravado como `14990`.

**Por quê.** Computador não representa `0,1` exatamente. Some centavos em
decimal o suficiente e aparece `R$ 149,899999`. Corrigir agora custa zero;
corrigir depois é migração com dado de cliente dentro.

O repositório de origem usava `149.9`. Foi convertido antes de existir catálogo
real.

---

## 5. O slug do produto é congelado na criação.

O endereço `/produto/top-tanga-sand` nasce com o produto e não muda mais,
mesmo que o nome mude.

**Por quê.** Se o endereço seguisse o nome, cada correção de nome quebraria o
link que já foi compartilhado no Instagram e zeraria a posição no Google.

**O custo.** Um produto renomeado fica com endereço "velho". Ninguém repara.

---

## 6. Nada é excluído. Tudo é arquivado.

O botão chama **Arquivar**, e o efeito é `ativo: false`.

**Por quê.** É a proteção mais barata que existe contra arrependimento. Produto
arquivado não gera HTML, sai do sitemap e some da vitrine — o efeito visível é
idêntico ao de excluir, mas dá pra voltar atrás.

---

## 7. O tamanho é a única variante. Cor saiu do modelo.

**Por quê.** No repositório de origem havia um campo de cor que era decorativo:
não mudava foto, nem preço, nem estoque. Um campo que finge ser variante e não é
custa caro no dia em que alguém tentar usar de verdade.

---

## 8. A grade de tamanhos é por produto, não fixa.

**Por quê.** Nem toda peça usa P/M/G/GG, e uma grade fixa viraria migração
com o catálogo já povoado no dia em que a primeira exceção aparecer.

**Kids não é grade, é variante.** A Linha Kids começou como categoria própria e
saiu (11/09/2026): a Eme Praia faz sob encomenda, então o mesmo biquíni sai em
adulto e em kids. Cada produto tem um `temKids` sim/não. Os tamanhos kids
(4/6/8/10/12) são fixos em `loja.config.ts` e **nunca esgotam**, porque sob
encomenda não tem estoque pra acabar. Na sacola o tamanho vai como `Kids 6`,
pra Mayara ler certo no pedido. Spec:
`docs/superpowers/specs/2026-09-11-linha-kids-como-variante-design.md`.

**Efeito colateral que vale saber.** `temEstoque` passou a significar "dá pra
pedir", não "tem peça na arara". Ele alimenta o selo "Esgotado" da vitrine e o
`availability` do schema.org em `lib/jsonld.tsx`. Com `temKids` ligado, o
produto é `InStock` pro Google mesmo com todo adulto esgotado — e desligar o
`temKids` de uma peça muda isso junto.

---

## 9. Um deploy por cliente. Sem multi-tenant.

Cada loja tem seu próprio repositório, banco e domínio.

**Por quê.** Multi-tenant introduz a pior classe de bug possível — cliente A
vendo dado do cliente B — e faz um deploy quebrado de uma loja derrubar a outra.
Com dois clientes, não há ganho que pague esse risco.

Este repositório é um **template pra clonar**, não um framework. Pacote npm
compartilhado e CLI de scaffold são conversa de N=3, quando já se souber o que
de fato se repetiu.

---

## 10. Fronteira única de dados: `lib/catalogo.ts`

Nenhum componente fala com a API direto. Todos passam por `lib/catalogo.ts`.

**Por quê.** Na Fase 1 o catálogo saiu do arquivo e foi pro banco, e a
troca mexeu em **um arquivo só**: as funções já eram `async` desde a Fase 0,
justamente pra que a assinatura não mudasse quando virasse `fetch`. Hoje a
fronteira também é onde o Zod valida e onde o build decide falhar.

---

## 11. Autenticação do painel será comprada pronta.

Cloudflare Access com código por e-mail, grátis até 50 usuários.

**Por quê.** Sem hash de senha, sem tabela de sessão, sem "esqueci minha senha"
— e sem falha de segurança que seja culpa nossa. O Access bloqueia na borda,
antes do código rodar.

**Verificar antes de escrever qualquer linha do painel:** subir um subdomínio
descartável e fazer login num celular que não é o do Cauê. Se travar, o plano B
é magic link próprio.

---

## 13. Dois Workers, um banco.

`eme-praia` (em `loja/`) serve o site e a API de leitura. `eme-praia-painel`
(em `painel/`) é o painel e a API de escrita, inteiro atrás do Cloudflare
Access. Os dois têm binding pro mesmo D1.

**Por quê.** O Access, hoje, protege um Worker inteiro pelo botão "Protect
this Worker behind Access", e isso funciona no `workers.dev` sem domínio
próprio. Proteger só um caminho (`/painel`) exigiria um domínio na zona, que
não existe ainda. Com dois Workers a fronteira de segurança é o Worker
inteiro: não há regra de caminho pra errar, e a loja não tem uma linha de
escrita.

**O custo.** Dois `wrangler.jsonc`, dois deploys, e o `database_id` repetido
nos dois. Em dev, os scripts compartilham o estado local com
`--persist-to ../.wrangler-state` pra não virar dois bancos.

**O Cookeria não é referência de formato.** Ele roda `@opennextjs/cloudflare`
(Next em runtime no Worker), exatamente o que a decisão 1 descarta aqui.

---

## Decisões de imagem

### O hero é a foto da campanha, sem corte no desktop

A foto é 1,88:1 (deitada). No celular a caixa fica em pé, então há corte
inevitável — e corte centralizado deixava só a barriga no quadro, com o biquíni
fora. O foco foi para 10% da esquerda, onde estão o top e o colar. No desktop a
seção usa a proporção exata da foto e não corta nada.

### O véu do hero é requisito de legibilidade, não estética

Medindo o contraste do branco sobre a foto, dividida em nove regiões, **nenhuma
passa de 3:1** nos 5% de pixels mais claros — o mínimo para texto grande. É foto
de sol a pino.

Quatro abordagens foram testadas. Gradiente diagonal escurecia a foto inteira em
38% e ainda parava em 2,7:1. Radial no canto caía rápido demais. Faixa inferior
apagava o quadril da modelo. O que ficou foram **dois gradientes empilhados**:
5,3:1 na mediana, 2,9:1 no pior percentil, escurecendo o corpo em apenas 16%.

**Se a foto do hero mudar, isso precisa ser medido de novo.** Uma foto de fim de
tarde precisaria de bem menos.

### Sem foto, aparece um slot — não uma imagem genérica

`components/ImagemSlot.tsx` desenha um retângulo tracejado quando o produto ou a
categoria está sem imagem.

**Por quê.** Não é só marcação de pendência. Na Fase 3 a Mayara vai cadastrar
peça e subir a foto depois; o site precisa saber desenhar o vazio em vez de
mostrar ícone de imagem quebrada.

---

## 12. Laranja preenche. Terra escreve.

A paleta saiu do selo — laranja de fundo, grafite recortado por dentro. Só que
o laranja da marca (`#FB7F20`) dá **2,5:1** sobre fundo claro: como texto ele
some. Então existem duas laranjas e cada uma tem um lugar fixo:

| | Onde | Contraste |
|---|---|---|
| `laranja` `#FB7F20` | preenchimento: CTA, sacola, badge — e como texto **só** em fundo escuro | 4,98:1 sobre grafite · 6,40:1 sobre breu |
| `terra` `#B35207` | a única laranja que vira tinta em fundo claro | 4,88:1 sobre gelo |

**Por quê.** A paleta anterior era a da i love bikini (creme/areia/bronze):
bege sobre bege, o bronze do botão dava 2,92:1 com o texto por cima. Trocar
bronze por laranja um-por-um resolveria o contraste e criaria outro problema —
o botão "Adicionar à sacola" se repete 8 vezes por tela na grade, e oito barras
laranja abafam a foto do produto, que é o que precisa gritar numa loja. Por
isso o botão do card é contorno de grafite e só preenche laranja no hover.

**O custo.** Duas laranjas na paleta em vez de uma, e alguém pode usar a errada.
É o preço de ter uma marca de cor forte e um site de fundo claro.

**Hover é o selo invertido:** laranja/grafite troca pra grafite/laranja. Mesmo
contraste nos dois estados (4,98:1), e não precisa de uma terceira laranja.

---

## Bugs herdados que foram corrigidos

O código veio do `ilovebkn-site`, uma loja já entregue. Estes problemas vieram
junto e foram consertados na migração:

| Bug | Correção |
|---|---|
| A sacola nunca esvaziava — `limpar()` existia e não era chamado | O drawer troca o conteúdo por "Pedido enviado" + botão. **Não** limpa no clique: se o WhatsApp não abrir, o carrinho estaria destruído. |
| O preço parcelado era coletado e nunca exibido | Virou preço no Pix vs no cartão, com "3x de R$ X" calculado. |
| A mensagem do WhatsApp não dizia qual produto era | Passou a incluir o link da peça. Ganho direto: ela acha o produto na arara. |
| Categoria estava escrita em três lugares e cada uma tinha sua pasta de rota | Uma rota dinâmica só, `app/[categoria]/page.tsx`. Categoria nova aparece sozinha, inclusive no menu. |
| As 20 páginas dividiam o mesmo `<title>` | `generateMetadata()` por produto. Sem isso a loja não existe no Google. |
| O menu apontava para `/acessorios`, categoria que não existe mais | O menu passou a ser gerado a partir das categorias. |
| O botão de finalizar desabilitado era texto creme sobre cinza claro — sumia | Passou a usar o mesmo par dos outros estados desabilitados (`bg-grafite/15` + `text-grafite/40`). |
