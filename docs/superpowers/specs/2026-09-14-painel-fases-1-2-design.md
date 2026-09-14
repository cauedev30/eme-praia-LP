# Painel de gestão — Fase 1 (banco + API) e Fase 2 (Access + tela de estoque)

Data: 2026-09-14 · Estado: aprovado pelo Cauê

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
por cliente (9). Fronteira única de dados (10). Login comprado pronto:
Cloudflare Access (11).

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
- O Access protege um Worker inteiro pelo botão "Protect this Worker behind
  Access" (aba Access do Worker), cobrindo a URL `workers.dev`. É tudo ou
  nada por Worker. Access por caminho exigiria domínio na zona.

## Decisão: dois Workers, um banco

| Worker | URL (até o domínio existir) | Faz | Access |
|---|---|---|---|
| `eme-praia` | `eme-praia.pedidos-jp.workers.dev` | serve `loja/out` como assets e a API de **leitura** | não |
| `eme-praia-painel` | `eme-praia-painel.pedidos-jp.workers.dev` | tela do painel e a API de **escrita** | sim, "All traffic" |

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
    src/index.ts             Hono: middleware de Access, tela, API de escrita
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

## Fase 2 — Access, tela de estoque, site reagindo

### 2a. Teste do Access antes de qualquer código do painel (decisão 11)

Worker de rascunho `acesso-teste`, dez linhas, responde
`logado como <e-mail>` lendo `ctx.access.getIdentity()`. Ligar "Protect this
Worker behind Access", "All traffic", política liberando dois e-mails (Cauê e
Mayara), login por código no e-mail (One-time PIN). Login de um celular que
não é o do Cauê.

O teste confirma: o código chega; a tela do Access é usável no celular; o
Worker enxerga o e-mail. Resultado registrado na decisão 11. Depois o Worker é
apagado.

Bifurcações previstas:

- `ctx.access` não existe no Hono → validar o header
  `Cf-Access-Jwt-Assertion` com a chave pública do time
  (`https://<time>.cloudflareaccess.com/cdn-cgi/access/certs`) e o AUD da
  aplicação. Isso vira o middleware.
- Login trava no celular → caminho C (magic link próprio), spec novo.

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

**Middleware de Access.** Antes de qualquer rota, se não houver identidade do
Access, responde 403. Se alguém desligar a proteção no dashboard por engano, o
painel fecha em vez de abrir. Em dev local, `.dev.vars` com `SEM_ACCESS=1`
pula a checagem; essa variável nunca é definida em produção.

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

Painel (Vitest + `@cloudflare/vitest-pool-workers`, que sobe um D1 real em
memória com as migrations aplicadas):

- toggle grava e devolve o estado; segundo toggle desfaz.
- 404 em tamanho inexistente e em produto inexistente.
- 400 em corpo inválido.
- 403 sem identidade quando `SEM_ACCESS` não está definido.

Depois, à mão: o Cauê no celular dele, depois a Mayara no dela. Marca um
tamanho esgotado no painel, abre a loja, o botão aparece riscado em até 30 s.

### 2g. Docs

- README: tabela de fases, mapa de pastas (`painel/` deixa de ser "a partir
  da Fase 1"), seção "Rodando" com os dois Workers.
- `docs/runbook-caue.md`: como subir os dois Workers em dev, como aplicar
  migration local e remota, como conferir o Access, o que fazer se
  `/api/catalogo.json` cair.
- `docs/stack.md`: Hono, Zod, wrangler, `@cloudflare/vitest-pool-workers`
  com versão real de `node_modules`; D1 sai de "para onde isso vai".
- `docs/decisoes.md`: resultado do teste na decisão 11; decisão 13 (dois
  Workers, um banco, e por quê); nota na decisão 3 dizendo que o overlay
  existe e carrega `temKids`.

### Entrega verificável da Fase 2

1. Testes da loja e do painel passam.
2. `eme-praia-painel.pedidos-jp.workers.dev` pede código no e-mail; e-mail
   fora da política é recusado; Mayara entra do celular dela.
3. Toque num tamanho muda a cor na hora; recarregar a página mantém; a loja
   mostra o tamanho riscado em até 30 s sem rebuild.
4. Chave kids desligada some com a fileira "Linha kids" da loja em até 30 s.
5. Com a proteção do Access desligada no dashboard, o painel responde 403.

---

## Fora do escopo

- Cadastro e edição de produto, categoria, preço, foto, ordem, arquivar
  (Fase 3).
- Workers Builds, deploy hook, rebuild automático (Fase 3).
- R2 (Fase 3; habilitar no dashboard antes).
- Domínio da Mayara e domínio custom nos Workers (pendência de lançamento).
- Registro de quem alterou o quê. Só `atualizado_em`.
- Catálogo real da Eme Praia. O seed carrega os 17 fixtures atuais.
