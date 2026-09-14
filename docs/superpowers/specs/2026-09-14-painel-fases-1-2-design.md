# Painel de gestão — Fase 1 (banco + API) e Fase 2 (login + tela de estoque)

Data: 2026-09-14 · Estado: aprovado pelo Cauê

> **Emenda de 2026-09-14, antes de escrever a Fase 2: o login deixou de ser
> Cloudflare Access e virou senha.** O desenho aprovado comprava a
> autenticação pronta (código por e-mail). Na hora de executar, o Cauê pediu
> senha: a Mayara marca esgotado no meio do expediente e buscar código no
> e-mail é atrito onde não pode ter. O Worker descartável do teste chegou a
> ser publicado, provou que fecha sozinho sem o Access, e foi apagado. O
> motivo completo e o que se perde estão na decisão 11. Mudam a seção 2a
> (vira o login por senha), o middleware em 2d, os testes em 2f e a entrega
> verificável. **O resto da Fase 2 — tela, toque, API de escrita, o site
> reagindo — não muda uma linha.**

## O problema

A Mayara precisa marcar tamanho esgotado sem depender do Cauê. Hoje o catálogo
mora em `loja/data/*.ts`: qualquer mudança é commit, build e deploy. A Fase 0
deixou o modelo certo e a fronteira única (`lib/catalogo.ts`) pronta pra troca;
o que falta é o banco, a API, o login e a tela.

Este spec cobre as Fases 1 e 2 do README. A Fase 3 (cadastro de produto,
upload de foto) fica pra outro spec.

## O que já está decidido e não se reabre

Site estático (decisão 1). Disponibilidade é booleano, nunca quantidade
(decisão 2). Dado separado por frequência de mudança (decisão 3). Preço em
centavos (4). Slug congelado (5). Nada excluído, tudo arquivado (6). Grade
adulto por produto, kids como variante fixa que nunca esgota (8). Um deploy
por cliente (9). Fronteira única de dados (10). Login por senha conferida no
servidor, com cookie assinado (11, reescrita).

## Fatos da conta Cloudflare que moldaram o desenho

Conferidos em 2026-09-14 com `wrangler whoami`, `deployments list` e `d1 list`:

- Conta `cauefranco01@gmail.com`, subdomínio `pedidos-jp.workers.dev`.
- O Cookeria (`rock-n-cookies`) roda `@opennextjs/cloudflare` e é publicado
  com `wrangler deploy` da máquina do Cauê. Serve de referência pra conta e
  pro hábito de deploy, não pro formato: aqui é estático + Hono.
- Nenhum banco D1 existe. R2 não está habilitado (exige cartão no dashboard;
  só importa na Fase 3).
- Não há domínio próprio na zona. O domínio da Mayara ainda não foi
  registrado.
- O Cookeria já roda um painel por senha em `/hoje`: a página é pública, mas
  a senha vai pro servidor (`POST /api/hoje/login`), não é conferida no
  navegador. É o padrão que o Cauê conhece e que a decisão 11 adota aqui.
- Secret de Worker (`wrangler secret put`) é o lugar da senha: fica fora do
  repo, fora do `wrangler.jsonc` e fora do bundle.

## Decisão: dois Workers, um banco

| Worker | URL (até o domínio existir) | Faz | Pede senha |
|---|---|---|---|
| `eme-praia` | `eme-praia.pedidos-jp.workers.dev` | serve `loja/out` como assets e a API de **leitura** | não |
| `eme-praia-painel` | `eme-praia-painel.pedidos-jp.workers.dev` | tela do painel e a API de **escrita** | sim, todas as rotas |

Os dois têm binding `DB` pro mesmo D1, chamado `eme-praia`.

**Por quê.** A fronteira de segurança vira o Worker inteiro: não existe regra
de caminho pra errar, e funciona hoje, sem domínio. A loja não tem uma linha
de escrita. **O custo** é dois `wrangler.jsonc` e dois `wrangler deploy`.

Quando o domínio da Mayara estiver na Cloudflare, cada Worker ganha um domínio
custom. Nenhum código muda.

Deploy continua manual, `wrangler deploy` em cada pasta, como no Cookeria.
Workers Builds e deploy hook só entram na Fase 3, quando cadastrar produto
precisar disparar rebuild sozinho.

## Pastas

```
clientes/eme-praia/
  loja/
    worker/index.ts          Hono: /api/catalogo.json, /api/disponibilidade.json
    wrangler.jsonc           name eme-praia · assets = out/ · binding DB
    lib/catalogo.ts          fetch + Zod (a fronteira não muda de lugar)
    lib/schema.ts            schemas Zod amarrados a lib/tipos.ts
    lib/aoVivo.ts            mescla build + disponibilidade.json (pura)
    components/DisponibilidadeProvider.tsx
    .env.example             API_URL=
  painel/
    src/index.ts             Hono: middleware de senha, login, tela, API de escrita
    src/tela.tsx             a lista de produtos com os toggles (JSX do Hono)
    public/painel.js         o script dos toques
    migrations/0001_catalogo.sql
    migrations/0002_seed.sql gerado uma vez, versionado
    scripts/gerar-seed.ts    lê loja/data/*.ts e escreve 0002_seed.sql
    wrangler.jsonc           name eme-praia-painel · binding DB (mesmo id)
```

`painel/` é dono do schema (migrations, seed). `loja/worker` só faz `SELECT`.
`lib/tipos.ts` continua sendo o contrato; o painel importa os tipos por
caminho relativo (`../loja/lib/tipos`) em vez de duplicar.

---

## Fase 1 — banco, API de leitura, build a partir do banco

### Schema (`painel/migrations/0001_catalogo.sql`)

```sql
CREATE TABLE categorias (
  id     TEXT PRIMARY KEY,
  slug   TEXT NOT NULL UNIQUE,
  nome   TEXT NOT NULL,
  imagem TEXT NOT NULL DEFAULT '',
  ordem  INTEGER NOT NULL,
  ativo  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE produtos (
  id                 TEXT PRIMARY KEY,
  slug               TEXT NOT NULL UNIQUE,
  nome               TEXT NOT NULL,
  descricao          TEXT NOT NULL DEFAULT '',
  categoria_id       TEXT NOT NULL REFERENCES categorias(id),
  preco_centavos     INTEGER NOT NULL,
  preco_pix_centavos INTEGER NOT NULL,
  imagens            TEXT NOT NULL DEFAULT '[]',   -- JSON: string[]
  tem_kids           INTEGER NOT NULL DEFAULT 0,
  ordem              INTEGER NOT NULL,
  ativo              INTEGER NOT NULL DEFAULT 1,
  atualizado_em      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tamanhos (
  produto_id TEXT NOT NULL REFERENCES produtos(id),
  tamanho    TEXT NOT NULL,
  ordem      INTEGER NOT NULL,
  disponivel INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (produto_id, tamanho)
);
```

Três escolhas:

- **Tamanhos em tabela própria.** O toque da Mayara é
  `UPDATE tamanhos SET disponivel = ? WHERE produto_id = ? AND tamanho = ?`.
  Uma linha, sem ler e reescrever o produto.
- **Imagens como JSON na coluna.** A Fase 3 grava a lista inteira de uma vez;
  ninguém edita uma foto isolada.
- **Produto aponta pra categoria por `id`.** A API devolve `categoria: slug`,
  como `tipos.ts` já espera. Se um dia o slug da categoria mudar, o produto
  não fica órfão.

Booleanos são `INTEGER` 0/1 (SQLite não tem boolean). A API converte.

### Seed

`painel/scripts/gerar-seed.ts` importa `loja/data/produtos.ts` e
`categorias.ts` e escreve `migrations/0002_seed.sql` com os `INSERT`s. Roda
uma vez. `wrangler d1 migrations apply eme-praia` aplica (local e `--remote`).
No mesmo commit, `loja/data/` é apagada e o script de seed também, porque o
que ele lia não existe mais. O `0002_seed.sql` fica versionado: é o registro
do que entrou no banco.

### API de leitura (`loja/worker/index.ts`)

Hono, só `SELECT`, sem autenticação.

| Rota | Devolve | Cache |
|---|---|---|
| `GET /api/catalogo.json` | `{ categorias: Categoria[], produtos: Produto[] }`, só `ativo = 1`, ordenados por `ordem`, no formato exato de `lib/tipos.ts` | `no-store`. Só o build chama |
| `GET /api/disponibilidade.json` | ver Fase 2 | `public, max-age=30, s-maxage=30` |

Qualquer outro caminho cai nos assets (`loja/out`). Erro de banco devolve 500
com corpo `{ erro }`, nunca um JSON parcial.

### A troca em `lib/catalogo.ts`

Sai `import ... from '@/data/...'`. Entra:

- `fetch(process.env.API_URL + '/api/catalogo.json')`. `API_URL` é variável
  de build **sem default**: faltando, o build para com mensagem dizendo qual
  variável e onde configurar.
- A resposta passa por `lib/schema.ts` (Zod). Cada schema é declarado com
  `satisfies z.ZodType<Produto>` (idem `Categoria`) pra que uma mudança em
  `tipos.ts` quebre a compilação em vez de passar silenciosa.
- O resultado é lido uma vez por build e guardado em memória no módulo, pra
  não bater na API a cada `generateStaticParams`.

Regras de falha:

| Situação | Efeito |
|---|---|
| API fora do ar, não-200, JSON malformado | **build falha**. O deploy anterior fica no ar |
| Zero produtos válidos | build falha. Nunca publicar loja vazia |
| Um produto inválido no Zod | pulado, `console.warn` com slug e motivo. O resto builda |
| Produto cuja categoria não veio válida | pulado, mesmo aviso |

As funções exportadas mantêm nome, assinatura e `async`. Componentes, sitemap
e jsonld não mudam. `temEstoque` não muda.

### Dev local

`wrangler dev` em `loja/` sobe a API em `localhost:8787` sobre um D1 local.
Cada pasta com `wrangler.jsonc` guarda seu próprio estado local em
`.wrangler/state`, então dois Workers teriam dois bancos locais diferentes.
Pra evitar isso, os scripts `dev` e `db:migrate:local` das duas pastas passam
`--persist-to ../.wrangler-state` (ignorado pelo git), e o D1 local é um só.
As migrations são aplicadas de `painel/`, que é onde moram:
`wrangler d1 migrations apply eme-praia --local --persist-to ../.wrangler-state`.
`loja/.env.local` (ignorado) define `API_URL`, apontando pro local ou pra
produção. `loja/.env.example` documenta.

### Entrega verificável da Fase 1

1. `cd loja && npm test && npm run build` gera `out/` com os mesmos 17
   produtos e 2 categorias de hoje, vindos do banco.
2. `wrangler deploy` em `loja/` publica em `eme-praia.pedidos-jp.workers.dev`;
   a home abre, um produto abre, `/api/catalogo.json` responde.
3. `loja/data/` não existe. Nenhum arquivo importa de `@/data`.
4. Com `API_URL` apontando pra uma porta morta, `npm run build` falha com
   mensagem clara e não escreve `out/` vazio.

---

## Fase 2 — login, tela de estoque, site reagindo

### 2a. Login por senha (decisão 11)

Uma senha só, em `SENHA_PAINEL`: secret do Worker em produção
(`wrangler secret put`), `.dev.vars` no local. Nunca no repo, nunca no
`wrangler.jsonc`.

**As rotas.**

| Rota | Faz |
|---|---|
| `GET /entrar` | tela de login: um campo de senha, um botão. Com cookie válido, redireciona pra `/` |
| `POST /entrar` | confere a senha. Acertou: grava o cookie e redireciona pra `/`. Errou: a mesma tela com "Senha errada.", status 401 |

**O middleware (`exigirSenha`).** Roda antes de tudo que não seja `/entrar`.
Cookie válido, segue. Sem cookie válido: pedido `GET` redireciona pra
`/entrar`; qualquer outro método responde 401 JSON. Assim a API de escrita
fica fechada pelo mesmo caminho da tela — não existe rota protegida só pela
aparência.

**O cookie.** Nome `sessao`, valor `<expiraEm>.<assinatura>`, onde `expiraEm`
é unix em segundos e a assinatura é `HMAC-SHA256(chave: SENHA_PAINEL,
mensagem: expiraEm)` em base64url. Conferir é recalcular o HMAC e comparar.

Três consequências, todas de propósito:

- Não existe tabela de sessão. O Worker não guarda nada; o cookie se prova
  sozinho.
- **Trocar a senha desloga todo mundo na hora**, porque a chave da assinatura
  é a própria senha. Serve de "sair de todos os aparelhos" sem escrever tela
  de logout.
- Um cookie forjado precisa da senha. Saber o formato não ajuda.

Atributos: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` de 90 dias. `Secure`
só quando o pedido chegou por `https`, pra não quebrar `http://localhost` no
dev.

**Comparar sem vazar.** Senha enviada e senha certa viram `SHA-256` (32 bytes
cada, sempre do mesmo tamanho) e são comparadas com
`crypto.subtle.timingSafeEqual`. Comparar as strings direto vazaria o tamanho
da senha e daria pra medir acerto por prefixo.

**Contra chute em massa.** Senha errada espera ~500 ms antes de responder.
É freio, não tranca: o que de fato segura é o tamanho da senha. A primeira
senha escolhida é fraca e isso está anotado como pendência na decisão 11.

**Onde a senha não pode aparecer:** log, mensagem de erro, URL (o formulário é
`POST`), HTML da tela. O Worker nunca a devolve, nem mascarada.

### 2b. A tela (`GET /`)

Uma página, celular primeiro. Produtos ativos agrupados por categoria ativa,
na ordem da vitrine. Cada produto é uma linha:

```
Top Meia Taça + Tanga Lateral Sand
[P] [M] [G] [GG]           cada um é um botão: cheio = disponível, riscado = esgotado
Tem versão kids   (o)      chave liga/desliga
```

Só isso. Sem busca, sem arquivar, sem preço, sem foto, sem categoria editável.
Produto sem grade adulto mostra só a chave kids. Cores da marca (laranja,
grafite, terra; ver decisão 12), não do Cauê. Alvo de toque mínimo de 44 px.
Sem framework no navegador: o HTML sai pronto do Hono (JSX), e
`public/painel.js` faz os toques.

### 2c. O toque (`public/painel.js`, ~40 linhas)

- Ao tocar, o botão muda na hora e manda o `PATCH`.
- Enquanto a resposta não volta, o botão fica desabilitado contra toque duplo.
- Resposta não-2xx ou erro de rede: o botão volta ao estado anterior e aparece
  a mensagem "Não salvou. Tenta de novo." por alguns segundos.
- Sem botão salvar, sem confirmação, sem recarregar a página.

### 2d. API de escrita (Hono + Zod, no Worker do painel)

| Rota | Corpo | Efeito | Erros |
|---|---|---|---|
| `PATCH /api/produtos/:id/tamanhos/:tamanho` | `{ disponivel: boolean }` | uma linha em `tamanhos` | 400 corpo inválido · 404 produto ou tamanho inexistente |
| `PATCH /api/produtos/:id` | `{ temKids: boolean }` | `tem_kids` em `produtos` | 400 · 404 |

Sucesso devolve 200 com o estado gravado (`{ disponivel }` ou `{ temKids }`).
Ambas atualizam `produtos.atualizado_em`.

**As duas rotas ficam atrás do `exigirSenha` da seção 2a**, pelo mesmo
middleware da tela. `PATCH` sem cookie válido responde 401 sem tocar no banco.
Se `SENHA_PAINEL` não existir no ambiente, o Worker recusa tudo em vez de
abrir: falta de configuração fecha o painel, não o escancara.

### 2e. O site reage (decisão 3 saindo do papel)

`GET /api/disponibilidade.json` no Worker da loja:

```json
{
  "top-tanga-sand": { "temKids": true, "tamanhos": { "P": true, "M": false, "G": true, "GG": true } }
}
```

Só produtos ativos. Carrega `temKids` porque a chave da Mayara também precisa
aparecer sem rebuild. Cache de 30 s no navegador e na borda.

No site:

- `components/DisponibilidadeProvider.tsx` (cliente, no `layout.tsx`) busca o
  JSON uma vez por carga de página, com URL relativa (`/api/...`, mesmo host
  do Worker). Guarda o mapa num Context. Se o fetch falhar, o mapa fica vazio.
- `useProdutoAoVivo(produto)` devolve o produto com `tamanhos` e `temKids`
  corrigidos pelo mapa. A mescla é `lib/aoVivo.ts`, função pura: entrada
  `(produto, mapa)`, saída `Produto`. Tamanho que existe no build e não no
  mapa mantém o valor do build. Tamanho que existe no mapa e não no build é
  ignorado (a grade é do build; disponibilidade é do mapa).
- `ProductCard` e `ProductDetail` chamam o hook no topo e usam o produto
  devolvido em tudo (botões, selo Esgotado, fileira kids, seleção inicial).
- `lib/jsonld.tsx` continua sendo o estado do build. O comentário lá já
  prevê isso.
- Em `next dev` sem o Worker rodando, o fetch falha e vale o build. Não é
  erro.

### 2f. Testes

Loja (Vitest, já instalado):

- `lib/schema.test.ts`: produto válido passa; preço float, slug vazio e
  `tamanhos` malformado falham.
- `lib/catalogo.test.ts`: com `fetch` simulado, produto inválido é pulado com
  aviso; zero produtos lança; não-200 lança.
- `lib/aoVivo.test.ts`: as regras de mescla acima.

Painel (Vitest + `@cloudflare/vitest-plugin`, que sobe um D1 real em memória
com as migrations aplicadas; ele **não** isola o armazenamento entre testes,
então cada teste reaplica as migrations num `beforeEach`, como em
`loja/worker/apply-migrations.ts`):

- senha certa devolve cookie assinado; senha errada devolve 401 e nenhum
  cookie.
- cookie forjado, cookie com assinatura de outra senha e cookie vencido são
  recusados.
- `GET /` sem cookie redireciona pra `/entrar`; `PATCH` sem cookie responde
  401 **e não muda o banco**.
- sem `SENHA_PAINEL` no ambiente, tudo é recusado.
- toggle grava e devolve o estado; segundo toggle desfaz.
- 404 em tamanho inexistente e em produto inexistente.
- 400 em corpo inválido.

Depois, à mão: o Cauê no celular dele, depois a Mayara no dela. Marca um
tamanho esgotado no painel, abre a loja, o botão aparece riscado em até 30 s.

### 2g. Docs

- README: tabela de fases, mapa de pastas (`painel/` deixa de ser "a partir
  da Fase 1"), seção "Rodando" com os dois Workers.
- README: tabela de fases, mapa de pastas, seção "Rodando" com os dois
  Workers.
- `docs/runbook-caue.md`: como subir os dois Workers em dev, como aplicar
  migration local e remota, **como trocar a senha do painel** e o que isso
  causa (todo mundo deslogado), o que fazer se `/api/catalogo.json` cair.
- `docs/stack.md`: Hono, Zod, wrangler, `@cloudflare/vitest-plugin` com
  versão real de `node_modules`; a linha do Cloudflare Access sai.
- `docs/decisoes.md`: decisão 11 reescrita (senha, o que se perde, a senha
  fraca como pendência); decisão 13 sem depender do Access; nota na decisão 3
  dizendo que o overlay existe e carrega `temKids`.

### Entrega verificável da Fase 2

1. Testes da loja e do painel passam.
2. `eme-praia-painel.pedidos-jp.workers.dev` cai na tela de senha; senha errada
   é recusada; senha certa entra e o celular não pede de novo ao voltar.
   Mayara entra do celular dela.
3. Toque num tamanho muda a cor na hora; recarregar a página mantém; a loja
   mostra o tamanho riscado em até 30 s sem rebuild.
4. Chave kids desligada some com a fileira "Linha kids" da loja em até 30 s.
5. `PATCH` direto na API, sem cookie, responde 401 e não muda o banco.
6. Trocar `SENHA_PAINEL` e fazer deploy derruba a sessão do celular.

---

## Fora do escopo

- Cadastro e edição de produto, categoria, preço, foto, ordem, arquivar
  (Fase 3).
- Workers Builds, deploy hook, rebuild automático (Fase 3).
- R2 (Fase 3; habilitar no dashboard antes).
- Domínio da Mayara e domínio custom nos Workers (pendência de lançamento).
- Registro de quem alterou o quê. Só `atualizado_em`.
- Catálogo real da Eme Praia. O seed carrega os 17 fixtures atuais.
