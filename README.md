# Eme Praia

Loja de moda praia com catálogo gerenciado pela dona da loja.

O site é estático e o catálogo é editado por um painel próprio — a Mayara marca
tamanho esgotado, cadastra produto e publica sem depender do desenvolvedor.

## Documentação

| Documento | Responde |
|---|---|
| [docs/stack.md](docs/stack.md) | **O que foi usado** — cada tecnologia, versão, e por que está aqui |
| [docs/decisoes.md](docs/decisoes.md) | **Por quê** — cada decisão de arquitetura, o motivo e o que ela custa |
| [docs/runbook-caue.md](docs/runbook-caue.md) | **Como operar** — regras do repo, pendências, o que verificar quando algo quebra |

Se você chegou agora, leia nessa ordem.

## Rodando

```bash
cd loja
npm install
cp .env.example .env.local   # API_URL: de onde o build busca o catalogo
npm run dev                  # localhost:3000 (le a API de producao)
npm run build                # gera os arquivos estaticos em loja/out/
npm run deploy               # build + wrangler deploy do Worker eme-praia

cd ../painel
npm install
npm run db:migrate:local     # D1 local em ../.wrangler-state (compartilhado com a loja)
npm run db:migrate:remote    # aplica migrations pendentes no D1 de producao
cp .dev.vars.example .dev.vars   # e colocar a senha do painel
npm run dev                      # localhost:8788, cai na tela de senha
npm run deploy
```

Não rode `npm run build` com o `npm run dev` aberto: os dois escrevem em
`loja/.next` e o build sobrescreve os pedaços que o dev está usando. O sintoma é
rota devolvendo 500 com "Cannot find module". A saída é apagar `.next` e subir
de novo.

## Mapa das pastas

| Pasta | O que é |
|---|---|
| `loja/` | O site público. Next.js 14 com `output: 'export'` — gera HTML estático |
| `painel/` | O painel de gestão e a API de escrita. Cloudflare Worker + D1, inteiro atrás de senha. Dono das migrations |
| `imagens/` | Arquivos originais da marca, sem compressão. Não vão pro ar |
| `docs/` | Documentação |

Dentro de `loja/`:

| Caminho | O que é |
|---|---|
| `loja.config.ts` | **O único arquivo que muda de cliente pra cliente.** Nome, WhatsApp, Instagram, domínio, grades de tamanho |
| `app/` | As rotas. Cada pasta vira um endereço |
| `app/[categoria]/` | Uma rota só serve `/biquinis`, `/maio` e as futuras |
| `app/produto/[slug]/` | A página de cada peça, com título e descrição próprios |
| `components/` | As peças da tela |
| `lib/catalogo.ts` | **A fronteira dos dados.** Ver abaixo |
| `lib/tipos.ts` | O formato do catálogo, espelhando o schema do banco |
| `worker/` | O Worker `eme-praia`: serve `out/` e `GET /api/catalogo.json` sobre o D1 |
| `wrangler.jsonc` | Config do Worker: assets em `out/`, binding `DB` pro D1 `eme-praia` |
| `public/` | O que é servido como arquivo: logos e a foto do hero |

## A decisão central da arquitetura

O catálogo é separado por **frequência de mudança**:

| Dado | Muda | Onde vive | Reflete em |
|---|---|---|---|
| Nome, preço, descrição, fotos, tamanhos | Vezes por semana | HTML assado no build | ~2 min (rebuild) |
| Disponibilidade por tamanho | Várias vezes por dia | JSON buscado em runtime | ≤30s, sem rebuild |

A disponibilidade é o único dado de alta frequência, e o único que o Google não
precisa ver no HTML. Por isso é a única dependência de runtime — todo o resto é
arquivo estático, servido de graça e sem limite pela Cloudflare.

**Não rodamos Next.js em runtime na Cloudflare.** Os adaptadores mudaram três
vezes em 18 meses (`next-on-pages` → `@opennextjs/cloudflare` → `vinext`) e o
suporte ao Next 14 já foi descontinuado. Arquivo HTML não é descontinuado.

### Disponibilidade é booleana, nunca quantidade

O checkout acontece no WhatsApp, então o sistema **nunca fica sabendo que houve
uma venda**. Um campo de quantidade estaria errado em vinte minutos e a dona da
loja pararia de confiar no painel. Por isso cada tamanho tem apenas
disponível/esgotado — um toque pra alternar.

## Fronteiras do código

- `loja.config.ts` — o único arquivo que muda de cliente pra cliente
- `lib/catalogo.ts` — a fronteira dos dados. Faz `fetch` em `/api/catalogo.json`
  no build, valida com `lib/schema.ts` e falha o build se a API cair.
- `lib/tipos.ts` — o formato do catálogo, espelhando o schema do banco

## Convenções

- **Slug de produto é congelado na criação e imutável.** Se seguisse o nome,
  cada renomeação viraria link morto e ranking perdido.
- **Preços em centavos (inteiro).** Float em campo de dinheiro vira
  `R$ 149,899999`.
- **Nada é excluído, tudo é arquivado** (`ativo: false`). Produto inativo não
  gera HTML, some do sitemap e some da vitrine.

## Fases

| Fase | Entrega | Estado |
|---|---|---|
| **0** | Modelo correto, rotas dinâmicas, SEO, identidade da marca — ainda em arquivo | ✅ concluída |
| **1** | Banco D1 + `/api/catalogo.json`. O site passa a buildar do banco | ✅ concluída |
| **2** | Login por senha + tela de estoque. **É a entrega que justifica o projeto** | ✅ concluída |
| **3** | Cadastro de produto + upload de foto com redimensionamento no navegador | a fazer |
| **4** | Documentação da cliente, vídeo, treinamento | a fazer |
