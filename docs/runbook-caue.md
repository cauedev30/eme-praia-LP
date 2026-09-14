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

**Fase 1 concluída.** O catálogo mora no D1 `eme-praia`. O site continua
estático: `next build` busca `GET /api/catalogo.json` no Worker `eme-praia`
e assa o HTML. Os dois estão em `https://eme-praia.pedidos-jp.workers.dev`.

Próximo: Fase 2 (teste do Access num Worker descartável, depois o painel).

## Os dois Workers e o banco

| | Pasta | Nome na Cloudflare | Faz |
|---|---|---|---|
| Site + API de leitura | `loja/` | `eme-praia` | serve `out/`, `GET /api/catalogo.json` |
| Painel | `painel/` | `eme-praia-painel` | dono das migrations; rotas na Fase 2 |

Os dois apontam pro mesmo `database_id` no `wrangler.jsonc`. Se um dia
divergirem, o site lê um banco e o painel escreve em outro — conferir os dois
arquivos antes de qualquer `wrangler d1 create`.

**Dev local.** Cada pasta tem seu `.wrangler/`, então os dois Workers teriam
dois bancos locais. Todos os scripts passam `--persist-to ../.wrangler-state`
pra que o D1 local seja um só. Ordem: `painel: npm run db:migrate:local`,
depois `loja: npm run worker:dev` (porta 8787), depois `loja: npm run dev` com
`API_URL=http://localhost:8787` no `.env.local`.

**Migration nova.** Arquivo `painel/migrations/000N_nome.sql`, aplicar local,
rodar `npm run test:worker` na loja (os testes aplicam as migrations num D1
em memória), depois `npm run db:migrate:remote`. Os testes do Worker não
isolam o banco entre testes sozinhos: `loja/worker/apply-migrations.ts` faz
`reset()` e reaplica as migrations num `beforeEach`. Copiar esse padrão no
painel.

**Deploy.** `loja: npm run deploy` (build + deploy). Enquanto não há Workers
Builds, é sempre da máquina do Cauê.

## Pendências antes do lançamento

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
cd loja && npm test && npm run test:worker && npm run build
```

Depois, sobre `loja/out/`:

- Cada produto tem `<title>` próprio (sem isso a loja some do Google)
- Produto com `ativo: false` **não** gera HTML, sai do sitemap e sai da home
- Tamanho com `disponivel: false` sai riscado e com o botão desabilitado
- `sitemap.xml` e `robots.txt` existem e apontam pro domínio certo
- Produto com adulto todo esgotado e `temKids: true` **não** aparece como
  esgotado; a fileira "Linha kids" continua clicável

## Quando algo quebrar

- **Build falhando** — é o comportamento certo se a API estiver fora. O deploy
  anterior continua no ar. Nunca fazer o build publicar catálogo vazio.
- **Produto novo não apareceu** — provavelmente não passou na validação. Olhar o
  log do build; produto inválido é pulado de propósito, pra não derrubar a loja.
- **`/api/catalogo.json` devolvendo 500** — o Worker logou `catalogo: erro no
  banco`. Ver com `npx wrangler tail eme-praia`. Quase sempre é migration não
  aplicada no remoto: `painel: npm run db:migrate:remote`.
- **Build com "API_URL nao definida"** — falta o `loja/.env.local`. Copiar de
  `.env.example`.
- **Clone novo: `npm run test:worker`, `worker:dev` ou `deploy` falham com erro
  estranho do workerd** — o npm deste projeto exige aprovar scripts de
  pós-instalação. Rodar `npm approve-scripts --allow-scripts-pending` em
  `loja/` e em `painel/`, depois `npm install` de novo.
- **Depois de mexer no `loja/package.json`** — ele tem `"type": "module"` por
  causa dos configs do Vitest 4. Qualquer `.js` novo na raiz de `loja/` vai
  ser lido como ES module; se um arquivo de config quebrar com "require is
  not defined", é isso.
- **`next dev` mostra catálogo velho ou erro depois de uma queda da API** —
  `lib/catalogo.ts` lê a API uma vez por processo e guarda em memória,
  inclusive a falha. Reiniciar o `npm run dev`.
