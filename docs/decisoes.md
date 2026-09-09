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

**Por quê.** A Linha Kids não usa P/M/G/GG, usa idade (2/4/6/8/10). Uma grade
fixa quebraria a categoria inteira e a correção viraria migração com o catálogo
já povoado.

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

Nenhum componente lê `data/` direto. Todos passam por `lib/catalogo.ts`.

**Por quê.** Na Fase 1 o catálogo sai do arquivo e vai pro banco. Com a
fronteira, essa troca mexe em **um arquivo só**. Todas as funções já são
`async` mesmo lendo de arquivo — justamente pra que a assinatura não mude
quando virar `fetch`.

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
