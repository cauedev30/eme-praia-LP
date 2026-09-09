# O que foi usado neste projeto

Uma linha por tecnologia: o que é, por que está aqui, e o que ela custa.
Versões conferidas em `loja/node_modules` — não são chute do `package.json`.

---

## Linguagens

| | Versão | O que é |
|---|---|---|
| **TypeScript** | 5.9.3 | JavaScript com tipos. O tipo existe só enquanto você escreve; no navegador vira JavaScript normal. É a linguagem em que **todo** o código deste projeto está escrito. |
| **CSS** | — | Escrito quase sempre via Tailwind, em classes no meio do HTML. O CSS solto vive só em `loja/app/globals.css`. |
| **SQL** | — | Ainda não usado. Entra na Fase 1, no schema do banco. |

`strict: true` está ligado no `tsconfig.json`. Isso significa que o TypeScript
recusa código com tipo ambíguo — por exemplo, usar um valor que pode ser
`undefined` sem checar antes. É chato no começo e evita a classe de bug mais
comum em JavaScript.

**Confusão comum:** Next.js, React e Tailwind **não são linguagens**. São
bibliotecas escritas em JavaScript que este projeto usa. A linguagem é o
TypeScript.

---

## Framework e biblioteca

### Next.js 14.2.35

O framework que organiza o site: rotas, geração das páginas, otimização do
JavaScript enviado ao navegador.

Está travado no 14, e não no 15/16, por um motivo concreto: o repositório de
origem (`ilovebkn-site`) já era 14, e subir de versão maior no meio de uma
migração mistura dois riscos numa coisa só. A versão está fixa (`14.2.35`, sem
`^`) — atualização de framework aqui é decisão, não acidente.

**App Router**, não Pages Router. Cada pasta dentro de `loja/app/` vira uma
rota. `app/produto/[slug]/page.tsx` gera `/produto/top-tanga-sand`.

### React 18.3.1

A biblioteca que desenha a tela. O Next usa React por baixo.

O projeto usa a divisão do React 18 entre dois tipos de componente:

- **Server Component** (o padrão) — roda só na hora do build. Pode ler o
  catálogo, pode ser `async`. Não vai um byte de JavaScript dele pro navegador.
  Ex.: `Header`, `CategoryGrid`, `ProductFeed`.
- **Client Component** (marcado com `'use client'` na primeira linha) — vai pro
  navegador porque precisa reagir a clique, guardar estado. Ex.: `CartProvider`,
  `ProductCard`, `CartDrawer`.

Essa fronteira é onde a Fase 1 vai encaixar a busca de dados. Não é detalhe de
estilo: é o que faz a home inteira pesar 98 KB de JavaScript.

### Tailwind CSS 3.4.19

Em vez de escrever CSS num arquivo à parte, você põe classes prontas direto no
HTML: `flex`, `px-6`, `text-white`. `bg-laranja` existe porque foi declarada em
`loja/tailwind.config.ts` — as cores da marca viraram nome.

O ganho real não é digitar menos. É que o Tailwind **apaga do CSS final toda
classe que ninguém usou**. O CSS não cresce com o tempo, e ninguém tem medo de
apagar um bloco de estilo achando que algo depende dele.

### PostCSS 8.5.26

Ferramenta que processa o CSS no build. Você nunca mexe nela — o Tailwind roda
em cima dela. Está no `package.json` porque o Tailwind exige.

---

## Ferramentas de apoio

| | Versão | Papel |
|---|---|---|
| **Node.js** | 24.18.0 | O programa que roda JavaScript fora do navegador. É o que executa `npm run dev` e `npm run build`. Não vai pro ar — é só a ferramenta de trabalho. |
| **npm** | — | Instala as bibliotecas. `package-lock.json` grava a versão exata de cada uma; é ele que faz sua máquina e o servidor de build instalarem exatamente o mesmo código. |
| **ESLint** 8.57.1 + `eslint-config-next` | | Aponta erro de código antes de rodar. |

---

## Fontes

Duas, carregadas pelo `next/font/google` em `loja/app/layout.tsx`:

- **Fraunces** — serifada, usada em título e na frase do hero (`font-serif`)
- **Jost** — sem serifa, usada no resto (`font-sans`)

O `next/font` baixa o arquivo da fonte **no build** e serve do seu próprio
domínio. O navegador do cliente nunca fala com o Google. Isso mata uma conexão
externa no carregamento e evita o "texto pula quando a fonte chega".

---

## Formatos de imagem

Todas as imagens do site estão em **WebP**. É um formato de imagem que
comprime melhor que JPG e PNG e é aceito por todo navegador atual.

Números reais deste projeto:

| Arquivo | Origem | Virou | Redução |
|---|---|---|---|
| `hero-1.webp` | PNG de 2.077 KB | 102 KB | 95% |
| `eme-logo.webp` | PNG de 958 KB | 153 KB | 84% |
| `app/icon.png` | PNG de 272 KB | 26 KB | 90% |

O ícone continua PNG porque é a convenção que o Next usa pro favicon. Ele ficou
pequeno por outro caminho: como a arte tem praticamente duas cores, foi
reduzido a uma paleta de 32 cores em vez de cor livre.

**Por que isso importa:** a foto do hero é a primeira coisa que carrega. 2 MB
num 4G de praia é a diferença entre a loja abrir e a cliente desistir.

Os arquivos originais, sem compressão, ficam em `imagens/` — fora da pasta do
site, então não vão pro ar. Servem pra refazer a otimização se algo mudar.

---

## O que **não** foi usado, de propósito

| Coisa | Por que ficou de fora |
|---|---|
| Banco de dados | Ainda não. Fase 1. Hoje o catálogo é `loja/data/*.ts`. |
| Gateway de pagamento | O checkout é conversa no WhatsApp. Não há pedido, nem cobrança, nem frete no sistema. |
| Biblioteca de estado (Redux, Zustand) | A sacola cabe num Context do próprio React. |
| Biblioteca de componentes (MUI, shadcn) | O visual é da marca da cliente, não de um kit. |
| `next/image` | O otimizador dele não roda em site estático. Usamos `<img>` com `width` e `height` escritos à mão, que é o que impede o layout de pular. |
| Cookies, analytics, banner de consentimento | Nada é coletado. Nenhum cookie é gravado. |

Cada item aqui é uma dependência que **não** vai quebrar, não vai pedir
atualização e não vai cobrar mensalidade.

---

## Para onde isso vai (Fase 1 em diante)

| | Papel |
|---|---|
| **Cloudflare Workers** | Serve os arquivos estáticos e a API. Arquivo estático é grátis e ilimitado. |
| **Cloudflare D1** | Banco SQLite gerenciado. Guarda catálogo e disponibilidade. |
| **Cloudflare R2** | Guarda as fotos que a Mayara subir. |
| **Cloudflare Access** | Login do painel por código no e-mail. Nenhuma linha de autenticação escrita à mão. |
| **Hono** | Framework pequeno pra escrever as rotas da API dentro do Worker. |
| **Zod** | Valida o que vem do banco antes de virar página. Produto inválido é pulado com log, em vez de derrubar o build. |

O raciocínio por trás de cada uma dessas escolhas está em
[decisoes.md](decisoes.md).
