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
npm run dev      # localhost:3000
npm run build    # gera os arquivos estáticos em loja/out/
```

Não rode `npm run build` com o `npm run dev` aberto: os dois escrevem em
`loja/.next` e o build sobrescreve os pedaços que o dev está usando. O sintoma é
rota devolvendo 500 com "Cannot find module". A saída é apagar `.next` e subir
de novo.

## Mapa das pastas

| Pasta | O que é |
|---|---|
| `loja/` | O site público. Next.js 14 com `output: 'export'` — gera HTML estático |
| `painel/` | Painel de gestão e API. Cloudflare Worker + D1 + R2 *(a partir da Fase 1)* |
| `imagens/` | Arquivos originais da marca, sem compressão. Não vão pro ar |
| `docs/` | Documentação |

Dentro de `loja/`:

| Caminho | O que é |
|---|---|
| `loja.config.ts` | **O único arquivo que muda de cliente pra cliente.** Nome, WhatsApp, Instagram, domínio, grades de tamanho |
| `app/` | As rotas. Cada pasta vira um endereço |
| `app/[categoria]/` | Uma rota só serve `/biquinis`, `/maio`, `/linha-kids` e as futuras |
| `app/produto/[slug]/` | A página de cada peça, com título e descrição próprios |
| `components/` | As peças da tela |
| `lib/catalogo.ts` | **A fronteira dos dados.** Ver abaixo |
| `lib/tipos.ts` | O formato do catálogo, espelhando o schema do banco |
| `data/` | O catálogo em arquivo. **Some na Fase 1**, quando virar banco |
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
- `lib/catalogo.ts` — a fronteira dos dados. Hoje lê de `data/`; na Fase 1 passa
  a fazer `fetch` na API. As funções já são `async` pra que a troca não mexa em
  mais nada.
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
| **1** | Banco D1 + `/api/catalogo.json`. O site passa a buildar do banco | a fazer |
| **2** | Cloudflare Access + tela de estoque. **É a entrega que justifica o projeto** | a fazer |
| **3** | Cadastro de produto + upload de foto com redimensionamento no navegador | a fazer |
| **4** | Documentação da cliente, vídeo, treinamento | a fazer |
