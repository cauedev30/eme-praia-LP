# Runbook — Cauê

Escrito pro Cauê de daqui a oito meses, que não vai lembrar de nada.

## Regras do repositório

- **Commits saem exclusivamente da conta `cauefranco01@gmail.com`.**
  Já configurado localmente. Conferir com `git config user.email`.
- **Nada do MazyOS entra aqui.** Este repositório fica dentro de
  `eme praia/clientes/eme-praia/`, mas é um repo git independente — o
  `.gitignore` do MazyOS ignora a pasta inteira. Antes de commitar, conferir
  onde você está com `git rev-parse --show-toplevel`.

## Estado atual

**Fase 2 concluída.** A Mayara marca tamanho esgotado e liga/desliga kids em
`https://eme-praia-painel.pedidos-jp.workers.dev`, entrando com a senha do
painel. A loja reflete em até 30 s via `/api/disponibilidade.json`.

Verificado em produção: sem cookie, `/` redireciona pra `/entrar`; a senha
certa abre a tela (17 produtos, 17 chaves kids, 68 botões de tamanho); `PATCH`
sem cookie responde 401 e não escreve; um toque num tamanho e no botão kids
apareceu no `/api/disponibilidade.json` da loja. Tudo revertido depois do
teste.

**Não verificado ainda:** ninguém abriu o overlay da loja num navegador de
celular de verdade, nem mediu se os alvos de toque ficaram em 44 px. Fazer
isso antes de contar pra Mayara que o toque é confiável no celular dela.

**Limite que fica, e é de propósito.** O overlay reduz pedido de tamanho
errado, não elimina. São dois buracos, de tamanhos bem diferentes:

- **O pequeno.** O botão do tamanho esgotado continua clicável por uns bons
  cem milissegundos, até o fetch de disponibilidade responder.
- **O grande, e é a sacola.** Ela vive no `localStorage` (`eme-sacola`) e
  **nunca** consulta disponibilidade: só `ProductCard` e `ProductDetail`
  chamam `useProdutoAoVivo`. A cliente põe o M na terça, a Mayara marca M
  esgotado na quarta, a cliente volta na sexta e manda o pedido do M. Não
  tem prazo pra isso expirar, e o checkout é WhatsApp, sem checagem nenhuma
  no servidor.

Isso é anterior à Fase 2 — a sacola já era assim. Mas se a Mayara disser "o
painel não funcionou", este é o primeiro lugar pra olhar antes de suspeitar
do painel. Aplicar disponibilidade à sacola está na entrada da Fase 3.

Próximo: Fase 3 (cadastro de produto, foto). Antes dela: habilitar R2 no
dashboard (pede cartão) e decidir Workers Builds + deploy hook.

### O que a Fase 3 tem que resolver antes de começar

Coisas que a Fase 2 deixou de pé de propósito, e que **quebram no dia em que
arquivar produto virar botão**:

- [ ] **Slug fora do mapa é ambíguo.** Hoje `aoVivo` trata "não veio no mapa"
      como "vale o build" — certo quando o fetch falhou, errado quando o
      produto foi arquivado. Produto arquivado depois do último build vai
      continuar com página estática mostrando tudo disponível. O provider
      precisa separar "não carregou" de "carregou e não tem".
- [ ] **A sacola ignora disponibilidade.** Ver "Limite que fica" acima.
- [ ] **A chave do cache da borda não tem versão.** `loja/worker/index.ts`
      guarda em `caches.default` com a URL crua. Se o formato do
      `/api/disponibilidade.json` mudar, a borda serve o formato velho por
      até 30 s depois do deploy. Pôr um `?v=2` na chave quando o formato
      mudar.
- [ ] **`SQL_TAMANHOS` lê tamanho de produto arquivado.** Saída certa, leitura
      desperdiçada — e o desperdício só cresce, porque arquivar não apaga.
- [ ] **Nenhuma rota de escrita filtra `produtos.ativo`.** Dá pra alternar
      tamanho de produto arquivado. Decidir junto com o 404.
- [ ] **Nada em `painel/public/` pode se chamar `index.html`.** Assets são
      servidos antes do Worker: isso sombrearia a `/` protegida por senha.

## Os dois Workers e o banco

| | Pasta | Nome na Cloudflare | Faz |
|---|---|---|---|
| Site + API de leitura | `loja/` | `eme-praia` | serve `out/`, `GET /api/catalogo.json`, `GET /api/disponibilidade.json` |
| Painel | `painel/` | `eme-praia-painel` | tela de estoque, `PATCH /api/...`, dono das migrations. **Inteiro atrás de senha** |

Os dois apontam pro mesmo `database_id` no `wrangler.jsonc`. Se um dia
divergirem, o site lê um banco e o painel escreve em outro — conferir os dois
arquivos antes de qualquer `wrangler d1 create`.

**Dev local.** Cada pasta tem seu `.wrangler/`, então os dois Workers teriam
dois bancos locais. Todos os scripts passam `--persist-to ../.wrangler-state`
pra que o D1 local seja um só. Ordem: `painel: npm run db:migrate:local`,
depois `loja: npm run worker:dev` (porta 8787), depois `loja: npm run dev` com
`API_URL=http://localhost:8787` no `.env.local`. O painel roda em **8788**
(fixado no script, senão os dois `wrangler dev` brigam pela 8787).

**O painel importa de `loja/`.** `painel/src/index.tsx` puxa
`../../loja/worker/consultas` por caminho relativo. Funciona porque o deploy
sai de um clone do repositório inteiro. No dia de configurar Workers Builds,
o projeto do painel **não pode** ter root directory `painel/` — ele precisa
de `loja/` presente pra buildar.

**Migration nova.** Arquivo `painel/migrations/000N_nome.sql`, aplicar local,
rodar `npm run test:worker` na loja (os testes aplicam as migrations num D1
em memória), depois `npm run db:migrate:remote`. Os testes do Worker não
isolam o banco entre testes sozinhos: `loja/worker/apply-migrations.ts` faz
`reset()` e reaplica as migrations num `beforeEach`. Copiar esse padrão no
painel.

**Deploy.** `loja: npm run deploy` (build + deploy). Enquanto não há Workers
Builds, é sempre da máquina do Cauê. Ordem de bootstrap num ambiente do zero:
o build busca o catálogo no Worker que ele mesmo vai substituir. Então, na
primeira vez, o Worker precisa existir antes do primeiro build (ver o
histórico da Task 3 do plano da Fase 1: o primeiro deploy foi feito com o
build ainda lendo de arquivo).

## A senha do painel

Ela vive em dois lugares e em nenhum arquivo do repo:

- **Produção:** secret do Worker. Pra trocar, `cd painel && npx wrangler secret put SENHA_PAINEL` e digitar a nova. Vale na hora, sem deploy.
- **Dev local:** `painel/.dev.vars` (ignorado pelo git). O `.dev.vars.example` diz o formato.

**Trocar a senha desloga todo mundo.** O cookie de sessão é assinado com a
própria senha, então trocar invalida os cookies já emitidos. É assim que se
tira o acesso de alguém: troca e reenvia só pra quem deve ter.

**Se o painel responder "Painel indisponivel." com 503**, o secret sumiu do
Worker (deploy de outra conta, secret apagado no dashboard). Repor com o
comando acima. O painel fechar sozinho nesse caso é de propósito.

**Se o painel abrir sem pedir senha**, algo muito errado: conferir em
Workers & Pages → `eme-praia-painel` → Settings → Variables que `SENHA_PAINEL`
está como **Secret**, não como texto, e que ninguém subiu um `.dev.vars` junto
no deploy.

**Se o painel responder erro 1102 (ou qualquer 5xx) logo no primeiro acesso**,
é o limite de CPU do plano gratuito do Workers — 10 ms por invocação — e o
PBKDF2 do login estourou. Baixar `ITERACOES` em `painel/src/sessao.ts` (hoje
5 000) resolve na hora. Assinar um plano pago da Cloudflare permite voltar a
subir esse número depois. Contexto completo na decisão 11.

**Trocar a senha ANTES de mandar pra Mayara.** A que está em produção hoje foi
escolhida de improviso e é fraca: palavra ligada ao negócio mais sequência de
teclado, chutável por quem sabe o nome da loja. Como não existe rate limiting
(ver o parágrafo do WAF abaixo), o tamanho da senha é a única defesa que
sobrou. Trocar por quatro palavras soltas. Contexto na decisão 11.

**Mandar a senha pra Mayara** por mensagem direta, nunca em grupo. Se cair em
grupo ou print, trocar na hora — é um comando.

**Contra chute em massa não existe defesa no código.** A espera de meio
segundo na senha errada atrapalha quem tenta na mão e mais nada: conexões em
paralelo passam por ela. Quem limita de verdade é regra de rate limiting do
WAF em `POST /entrar` (dashboard → o domínio → Security → WAF → Rate limiting
rules, algo como 10 tentativas por minuto por IP). Não está ligada. Enquanto
não estiver, o que segura é o tamanho da senha.

## Pendências antes do lançamento

- [ ] **Trocar `SENHA_PAINEL` por quatro palavras soltas antes de mandar pra
      Mayara.** A atual é fraca de propósito conhecido (decisão 11), e sem
      rate limiting ela é a única defesa. `cd painel && npx wrangler secret
      put SENHA_PAINEL`. Vale na hora e desloga quem estiver logado.
- [ ] Abrir o painel num celular de verdade e conferir os alvos de toque.
      Ninguém viu isso renderizado ainda — só HTML por `curl`.
- [ ] `loja.config.ts`: WhatsApp, Instagram e domínio reais da Mayara
- [ ] `loja.config.ts`: confirmar com a Mayara a grade kids (`gradeKids`,
      hoje 4/6/8/10/12) e se toda peça sai em kids (senão, desligar
      `temKids` nas que não saem)
- [ ] **Texto repetido**: "Seu verão começa aqui." está no hero e também
      no FeatureBanner do meio da home. Decidir qual dos dois muda.
- [x] Logo da Eme Praia — os dois arquivos vêm de `imagens/logos/` sem
      alteração de arte: `eme-logo.webp` (o selo completo, com o anel
      de escrita) no topo, 80px no celular e 112px no desktop; e
      `eme-lettering.webp` no rodapé. Ícone da aba: `app/icon.png`,
      o mesmo selo em 512px quantizado em 32 cores (26 KB).
      O coração do i love bikini saiu junto com o `HeartMark.tsx`.
- [x] Hero: `public/hero/hero-1.webp` (foto da Mayara, 2077 KB -> 102 KB).
      A foto é 1,88:1. No celular a caixa é 55svh com foco em `10% 50%`
      (centralizado corta as peças e sobra só a barriga). No desktop a
      seção usa `aspect-[1721/914]`, a proporção da própria foto, então
      não há corte — se mexer na altura, o corte volta.
      A frase "Seu verão começa aqui." + botão "Confira Coleção" fica no
      canto inferior direito. O véu de dois gradientes não é enfeite: a
      foto é de sol a pino e sem ele o branco fica em 1,3:1 ali. Com ele,
      5,3:1 na mediana. Se trocar a foto do hero, remedir.
- [ ] **Todas as fotos de catálogo** — `public/` hoje tem só a hero-1 e os
      dois logos. Nenhuma imagem do i love bikini ficou no repo.
      Sem foto, o `ImagemSlot` desenha um retângulo tracejado no lugar:
      2 categorias, 17 produtos e o banner do meio da home.
      Falta: fotos de produto, capa das 2 categorias e foto do banner.
- [ ] Catálogo real — os 17 produtos atuais são fixtures herdados
- [x] Paleta (`tailwind.config.ts`) — creme/areia/bronze/carvao/noturno saíram.
      A paleta agora é só a marca: `laranja`+`grafite` do selo, mais `terra`
      (laranja escurecido pra virar tinta), `breu`, `gelo` e `concha`.
      A regra que segura ela está na decisão 12. Se for mexer, remedir contraste.
- [ ] Fontes (`tailwind.config.ts`) — Fraunces/Jost ainda são herdadas da
      i love bikini; nunca foram conferidas contra a marca da Eme
- [ ] Domínio registrado **no nome da Mayara** no Registro.br, DNS na Cloudflare

## Verificações que valem repetir a cada mudança grande

```bash
cd loja && npm test && npm run test:worker && npm run worker:typecheck && npm run build
cd ../painel && npm run typecheck && npm test
```

Depois, sobre `loja/out/`:

- Cada produto tem `<title>` próprio (sem isso a loja some do Google)
- Produto com `ativo: false` **não** gera HTML, sai do sitemap e sai da home
- Tamanho com `disponivel: false` sai riscado e com o botão desabilitado
- `sitemap.xml` e `robots.txt` existem e apontam pro domínio certo
- Produto com adulto todo esgotado e `temKids: true` **não** aparece como
  esgotado; a fileira "Linha kids" continua clicável
- Toque no painel aparece no site em até 30 s sem rebuild (o HTML do build
  pode dizer "disponível"; o navegador corrige)
- `PATCH` na API do painel sem estar logado responde 401 e não muda o banco

## Quando algo quebrar

- **Build falhando** — é o comportamento certo se a API estiver fora. O deploy
  anterior continua no ar. Nunca fazer o build publicar catálogo vazio.
- **Produto novo não apareceu** — provavelmente não passou na validação. Olhar o
  log do build; produto inválido é pulado de propósito, pra não derrubar a loja.
- **`/api/catalogo.json` ou `/api/disponibilidade.json` devolvendo 500** — o
  Worker logou `loja: erro no banco`. Ver com `npx wrangler tail eme-praia`.
  Quase sempre é migration não aplicada no remoto:
  `painel: npm run db:migrate:remote`.
- **"Marquei esgotado no painel e o site não mudou"** — na ordem:
  1. Confere se gravou mesmo:
     `curl -s https://eme-praia.pedidos-jp.workers.dev/api/disponibilidade.json | grep SLUG`.
     Se o JSON já mostra `false`, o painel fez a parte dele.
  2. Se o JSON mostra certo e a página não, são os 30 s de cache da borda.
     Esperar, ou furar com `?t=1` pra confirmar.
  3. Se o JSON mostra errado, `npx wrangler tail eme-praia` procurando
     `loja: erro no banco`. **Um 500 nessa rota é invisível pra cliente**:
     o `DisponibilidadeProvider` engole o erro de propósito e a página fica
     com o estado do build. Ou seja, o site parecendo normal não prova que
     essa rota está de pé.
  4. Se nada disso, é a sacola: ver "Limite que fica" lá em cima.
- **Build com "API_URL nao definida"** — falta o `loja/.env.local`. Copiar de
  `.env.example`.
- **Clone novo: `npm run test:worker`, `worker:dev` ou `deploy` falham com erro
  estranho do workerd** — o npm deste projeto exige aprovar scripts de
  pós-instalação. Rodar `npm approve-scripts --all` em `loja/` e em
  `painel/`, depois `npm install` de novo.
- **Depois de mexer no `loja/package.json`** — ele tem `"type": "module"` por
  causa dos configs do Vitest 4. Qualquer `.js` novo na raiz de `loja/` vai
  ser lido como ES module; se um arquivo de config quebrar com "require is
  not defined", é isso.
- **`next dev` mostra catálogo velho ou erro depois de uma queda da API** —
  `lib/catalogo.ts` lê a API uma vez por processo e guarda em memória,
  inclusive a falha. Reiniciar o `npm run dev`.
- **Painel com erro 1102 ou 5xx no primeiro acesso** — estourou o limite de
  CPU do plano gratuito do Workers. Ver "A senha do painel" acima: baixar
  `ITERACOES` em `painel/src/sessao.ts`.
