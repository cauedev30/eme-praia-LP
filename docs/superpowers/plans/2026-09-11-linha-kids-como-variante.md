# Linha Kids como variante do produto — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar a categoria Linha Kids e fazer cada produto poder ser pedido em tamanho kids (4/6/8/10/12) direto na página da peça, sempre disponível, sob encomenda.

**Architecture:** `Produto` ganha `temKids: boolean`. A grade kids é fixa no `loja.config.ts` e nunca esgota. A lógica de variante (rótulo "Kids N", seleção inicial, tem variante) vai pra `lib/variantes.ts`, puro e testado com Vitest. `ProductDetail` e `ProductCard` consomem essas funções; `temEstoque` passa a considerar kids. A categoria `linha-kids` some de `data/categorias.ts` e com ela a rota, o menu e o sitemap, que são gerados da lista.

**Tech Stack:** Next.js 14.2.35 (App Router, `output: 'export'`), React 18, TypeScript 5 strict, Tailwind 3.4. Novo: Vitest (devDependency) só pra lógica pura em `lib/`.

Spec: `docs/superpowers/specs/2026-09-11-linha-kids-como-variante-design.md`

## Global Constraints

- Todo comando roda dentro de `loja/` (é onde está o `package.json`), salvo os `git` que rodam na raiz do repo `eme-praia`.
- Commits saem da conta `cauefranco01@gmail.com` (já é a config local; conferir com `git config user.email`). Toda mensagem de commit termina com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Nada do MazyOS entra neste repo.** `git rev-parse --show-toplevel` tem que devolver `.../clientes/eme-praia`.
- Grade kids: exatamente `['4', '6', '8', '10', '12']`.
- Tamanho kids na sacola: string `'Kids ' + número` (ex.: `'Kids 6'`). O prefixo é literal, com espaço.
- Rótulo na tela: **"Linha kids"** (k minúsculo), no mesmo estilo do rótulo "Tamanho".
- Kids nunca esgota. Não existe booleano de disponibilidade pra kids.
- Não rodar `npm run build` com `npm run dev` aberto (os dois escrevem em `.next`).
- Sem emojis em código, docs ou commits.

---

### Task 0: Commitar a passada de paleta que está pendente

Há 19 arquivos modificados e não commitados (paleta laranja/grafite, decisão 12 do `docs/decisoes.md`). Dois deles (`ProductDetail.tsx`, `ProductCard.tsx`) vão ser editados neste plano. Commitar antes pra não misturar as duas coisas num diff só.

**Files:**
- Nenhum arquivo novo. Só commit do que já está modificado.

- [ ] **Step 1: Conferir que é só a paleta**

Run (na raiz `eme-praia`): `git status --short`
Expected: 19 linhas `M`, todas em `docs/` ou `loja/components/`, `loja/app/`, `loja/tailwind.config.ts`. Nenhum `??`.

- [ ] **Step 2: Commitar**

```bash
git add -A
git commit -m "feat(loja): paleta da marca — laranja preenche, terra escreve

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Run: `git status --short`
Expected: vazio.

---

### Task 1: Vitest + modelo de dados (`temKids`, grade kids no config, categoria removida)

**Files:**
- Modify: `loja/package.json` (scripts + devDependency)
- Create: `loja/vitest.config.ts`
- Modify: `loja/lib/tipos.ts` (campo `temKids` em `Produto`)
- Modify: `loja/loja.config.ts` (descrição, `gradeKids`)
- Modify: `loja/data/categorias.ts` (remover `linha-kids`)
- Modify: `loja/data/produtos.ts` (`temKids: true` nos 17; comentário)
- Modify: `loja/lib/catalogo.ts` (`temEstoque` considera kids)
- Test: `loja/lib/catalogo.test.ts`

**Interfaces:**
- Produces: `Produto.temKids: boolean`; `loja.gradeKids: readonly ['4','6','8','10','12']`; `temEstoque(produto)` verdadeiro se `temKids` ou algum adulto disponível ou sem grade.

- [ ] **Step 1: Instalar o Vitest**

Run (em `loja/`): `npm install --save-dev vitest@^3`
Expected: `package.json` ganha `"vitest": "^3.x.x"` em devDependencies. `package-lock.json` muda.

- [ ] **Step 2: Script de teste e config**

Em `loja/package.json`, dentro de `"scripts"`, adicionar:

```json
    "test": "vitest run"
```

Criar `loja/vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// So logica pura em lib/. Componente e testado pelo build + olho.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['lib/**/*.test.ts'],
    exclude: ['node_modules', 'out', '.next'],
  },
})
```

- [ ] **Step 3: Escrever o teste que falha**

Criar `loja/lib/catalogo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { temEstoque } from '@/lib/catalogo'
import type { Produto } from '@/lib/tipos'

const base: Produto = {
  id: 'x',
  slug: 'x',
  nome: 'X',
  descricao: '',
  categoria: 'biquinis',
  precoCentavos: 10000,
  precoPixCentavos: 9000,
  imagens: [],
  tamanhos: [],
  temKids: false,
  ordem: 1,
  ativo: true,
}

describe('temEstoque', () => {
  it('sem grade e sem kids: sempre a venda', () => {
    expect(temEstoque(base)).toBe(true)
  })

  it('adulto todo esgotado e sem kids: esgotado', () => {
    const p = { ...base, tamanhos: [{ tamanho: 'M', disponivel: false }] }
    expect(temEstoque(p)).toBe(false)
  })

  it('adulto todo esgotado mas com kids: a venda (kids e sob encomenda)', () => {
    const p = { ...base, tamanhos: [{ tamanho: 'M', disponivel: false }], temKids: true }
    expect(temEstoque(p)).toBe(true)
  })

  it('um adulto disponivel: a venda', () => {
    const p = {
      ...base,
      tamanhos: [
        { tamanho: 'P', disponivel: false },
        { tamanho: 'M', disponivel: true },
      ],
    }
    expect(temEstoque(p)).toBe(true)
  })
})
```

- [ ] **Step 4: Rodar e ver falhar**

Run (em `loja/`): `npm test`
Expected: FAIL. O terceiro caso (`adulto todo esgotado mas com kids`) devolve `false`. Os outros passam ou o TS reclama de `temKids` não existir em `Produto`. Os dois são falha esperada.

- [ ] **Step 5: `temKids` no tipo**

Em `loja/lib/tipos.ts`, dentro de `Produto`, logo depois de `tamanhos: Tamanho[]`:

```ts
  /** A mesma peca tambem sai em tamanho kids, sob encomenda. A grade kids
   *  e fixa (loja.config.ts -> gradeKids) e nunca esgota — por isso nao
   *  entra em `tamanhos`. */
  temKids: boolean
```

- [ ] **Step 6: Config**

Em `loja/loja.config.ts`:

Trocar a linha `descricao`:
```ts
  descricao: 'Moda praia — biquínis e maiôs, com linha kids sob encomenda.',
```

Trocar o bloco `gradesSugeridas` inteiro (com o comentário acima dele) por:
```ts
  // Grade sugerida no painel ao cadastrar produto. A grade adulto real e por
  // produto (fica em produto.tamanhos), isso aqui e so o pre-preenchimento.
  gradesSugeridas: {
    adulto: ['P', 'M', 'G', 'GG'],
  },

  // Grade kids. Fixa pra loja inteira: a peca e sob encomenda, entao todo
  // produto com `temKids` oferece estes tamanhos e nenhum deles esgota.
  // Confirmar com a Mayara antes do lancamento — 4 a 12 e hipotese do Caue.
  gradeKids: ['4', '6', '8', '10', '12'],
```

- [ ] **Step 7: Remover a categoria**

Em `loja/data/categorias.ts`, apagar o objeto inteiro de `linha-kids` (do `{` até o `},` que fecha, incluindo o `TODO`). Ficam só `biquinis` (ordem 1) e `maio` (ordem 2).

- [ ] **Step 8: Fixtures**

Em `loja/data/produtos.ts`:

Apagar a linha de comentário:
```
// A Linha Kids nasce vazia de proposito — a pagina de categoria trata isso.
```

Nos 17 produtos, adicionar `temKids: true,` logo depois de cada `ordem: N,`. Um `sed` faz isso de uma vez (em `loja/`, Git Bash):

```bash
sed -i 's/^\(\s*\)ordem: \([0-9]*\),$/\1ordem: \2,\n\1temKids: true,/' data/produtos.ts
```

Run: `grep -c "temKids: true," data/produtos.ts`
Expected: `17`

- [ ] **Step 9: `temEstoque`**

Em `loja/lib/catalogo.ts`, trocar a função inteira (com o comentário):

```ts
/** Um produto so esta a venda se tiver ao menos um tamanho disponivel.
 *  Produto sem grade (tamanhos vazio) esta sempre disponivel. Produto com
 *  kids tambem: kids e sob encomenda e nunca esgota. */
export function temEstoque(produto: Produto) {
  return (
    produto.temKids ||
    produto.tamanhos.length === 0 ||
    produto.tamanhos.some((t) => t.disponivel)
  )
}
```

- [ ] **Step 10: Rodar e ver passar**

Run (em `loja/`): `npm test`
Expected: `4 passed`.

Run (em `loja/`): `npx tsc --noEmit`
Expected: sem erro.

- [ ] **Step 11: Commit**

```bash
git add loja/package.json loja/package-lock.json loja/vitest.config.ts loja/lib/tipos.ts loja/loja.config.ts loja/data/categorias.ts loja/data/produtos.ts loja/lib/catalogo.ts loja/lib/catalogo.test.ts
git commit -m "feat(loja): kids vira variante do produto, nao categoria

Produto ganha temKids; grade kids fixa em loja.config (4-12) e nunca esgota.
Categoria linha-kids removida. Vitest entra pra testar lib/.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `lib/variantes.ts` — a lógica de seleção, pura e testada

**Files:**
- Create: `loja/lib/variantes.ts`
- Test: `loja/lib/variantes.test.ts`

**Interfaces:**
- Consumes: `Produto.temKids`, `loja.gradeKids` (Task 1).
- Produces:
  - `rotuloKids(tamanho: string): string` devolve `'Kids 6'`
  - `tamanhosKids(produto: Produto): string[]` devolve `['4','6','8','10','12']` se `temKids`, senão `[]`
  - `temVariante(produto: Produto): boolean` verdadeiro se tem grade adulto ou kids
  - `selecaoInicial(produto: Produto): string | undefined` primeiro adulto disponível, senão `undefined`

- [ ] **Step 1: Escrever o teste que falha**

Criar `loja/lib/variantes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { rotuloKids, selecaoInicial, tamanhosKids, temVariante } from '@/lib/variantes'
import type { Produto } from '@/lib/tipos'

const base: Produto = {
  id: 'x',
  slug: 'x',
  nome: 'X',
  descricao: '',
  categoria: 'biquinis',
  precoCentavos: 10000,
  precoPixCentavos: 9000,
  imagens: [],
  tamanhos: [],
  temKids: false,
  ordem: 1,
  ativo: true,
}

describe('rotuloKids', () => {
  it('prefixa com "Kids " pra Mayara ler certo no pedido', () => {
    expect(rotuloKids('6')).toBe('Kids 6')
  })
})

describe('tamanhosKids', () => {
  it('vazio quando o produto nao tem kids', () => {
    expect(tamanhosKids(base)).toEqual([])
  })

  it('a grade fixa da loja quando tem kids', () => {
    expect(tamanhosKids({ ...base, temKids: true })).toEqual(['4', '6', '8', '10', '12'])
  })
})

describe('temVariante', () => {
  it('falso sem grade e sem kids', () => {
    expect(temVariante(base)).toBe(false)
  })

  it('verdadeiro so com kids', () => {
    expect(temVariante({ ...base, temKids: true })).toBe(true)
  })

  it('verdadeiro so com grade adulto', () => {
    expect(temVariante({ ...base, tamanhos: [{ tamanho: 'M', disponivel: false }] })).toBe(true)
  })
})

describe('selecaoInicial', () => {
  it('primeiro adulto disponivel', () => {
    const p = {
      ...base,
      tamanhos: [
        { tamanho: 'P', disponivel: false },
        { tamanho: 'M', disponivel: true },
        { tamanho: 'G', disponivel: true },
      ],
    }
    expect(selecaoInicial(p)).toBe('M')
  })

  it('adulto todo esgotado com kids: nada pre-selecionado, a cliente escolhe', () => {
    const p = { ...base, tamanhos: [{ tamanho: 'M', disponivel: false }], temKids: true }
    expect(selecaoInicial(p)).toBeUndefined()
  })

  it('sem grade adulto: nada pre-selecionado', () => {
    expect(selecaoInicial({ ...base, temKids: true })).toBeUndefined()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run (em `loja/`): `npm test`
Expected: FAIL. `Cannot find module '@/lib/variantes'` (ou equivalente).

- [ ] **Step 3: Implementar**

Criar `loja/lib/variantes.ts`:

```ts
import type { Produto } from '@/lib/tipos'
import { loja } from '@/loja.config'

// O que a cliente escolhe antes de por na sacola. Duas fontes:
//  - grade adulto, por produto, com esgotado por tamanho (produto.tamanhos)
//  - grade kids, fixa na loja, sob encomenda, nunca esgota (loja.gradeKids)
// A selecao e UMA string: 'M' ou 'Kids 6'. E o que vai pra sacola e pro
// WhatsApp, entao o prefixo e parte do dado, nao so da tela.

const PREFIXO_KIDS = 'Kids '

export function rotuloKids(tamanho: string) {
  return `${PREFIXO_KIDS}${tamanho}`
}

export function tamanhosKids(produto: Produto): string[] {
  return produto.temKids ? [...loja.gradeKids] : []
}

export function temVariante(produto: Produto) {
  return produto.tamanhos.length > 0 || produto.temKids
}

/** Primeiro adulto disponivel. Kids nunca e pre-selecionado: se so sobrou
 *  kids, a cliente clica — e uma escolha que ela precisa fazer de olho aberto. */
export function selecaoInicial(produto: Produto): string | undefined {
  return produto.tamanhos.find((t) => t.disponivel)?.tamanho
}
```

- [ ] **Step 4: Rodar e ver passar**

Run (em `loja/`): `npm test`
Expected: `13 passed` (4 de catalogo + 9 de variantes).

- [ ] **Step 5: Commit**

```bash
git add loja/lib/variantes.ts loja/lib/variantes.test.ts
git commit -m "feat(loja): logica de variante adulto/kids em lib/variantes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Bloco "Linha kids" na página do produto

**Files:**
- Modify: `loja/components/ProductDetail.tsx`

**Interfaces:**
- Consumes: `rotuloKids`, `tamanhosKids`, `temVariante`, `selecaoInicial` (Task 2); `temEstoque` (Task 1).

Sem teste automatizado de componente (não há jsdom no projeto). A verificação é o build mais a checagem visual do Step 4.

- [ ] **Step 1: Imports e estado**

Em `loja/components/ProductDetail.tsx`, trocar o bloco de imports e o começo do componente. De:

```tsx
import { useState } from 'react'
import type { Produto } from '@/lib/tipos'
import { formatarCentavos, parcelamento } from '@/lib/preco'
import { useSacola } from '@/components/CartProvider'
import BackButton from '@/components/BackButton'
import ImagemSlot from '@/components/ImagemSlot'

export default function ProductDetail({ produto }: { produto: Produto }) {
  const primeiroDisponivel = produto.tamanhos.find((t) => t.disponivel)?.tamanho
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(primeiroDisponivel)
  const [quantidade, setQuantidade] = useState(1)
  const { adicionar } = useSacola()

  const temGrade = produto.tamanhos.length > 0
  const esgotado = temGrade && !produto.tamanhos.some((t) => t.disponivel)
  const podeAdicionar = !esgotado && (!temGrade || Boolean(tamanhoSelecionado))
```

Para:

```tsx
import { useState } from 'react'
import type { Produto } from '@/lib/tipos'
import { formatarCentavos, parcelamento } from '@/lib/preco'
import { temEstoque } from '@/lib/catalogo'
import { rotuloKids, selecaoInicial, tamanhosKids, temVariante } from '@/lib/variantes'
import { useSacola } from '@/components/CartProvider'
import BackButton from '@/components/BackButton'
import ImagemSlot from '@/components/ImagemSlot'

export default function ProductDetail({ produto }: { produto: Produto }) {
  // Uma selecao so: 'M' ou 'Kids 6'. Clicar num desmarca o outro.
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(selecaoInicial(produto))
  const [quantidade, setQuantidade] = useState(1)
  const { adicionar } = useSacola()

  const temGrade = produto.tamanhos.length > 0
  const kids = tamanhosKids(produto)
  const esgotado = !temEstoque(produto)
  const precisaEscolher = temVariante(produto) && !tamanhoSelecionado
  const podeAdicionar = !esgotado && !precisaEscolher
```

- [ ] **Step 2: O bloco kids abaixo do adulto**

Logo depois do `)}` que fecha o `{temGrade && ( ... )}` (o bloco do rótulo "Tamanho") e antes do `<div>` de "Quantidade", inserir:

```tsx
          {kids.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-grafite/60">Linha kids</p>
              <div className="flex gap-2">
                {kids.map((tamanho) => {
                  const valor = rotuloKids(tamanho)
                  return (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setTamanhoSelecionado(valor)}
                      aria-label={`Tamanho kids ${tamanho}`}
                      className={
                        tamanhoSelecionado === valor
                          ? 'h-9 min-w-9 border border-grafite bg-grafite px-2 text-sm text-gelo'
                          : 'h-9 min-w-9 border border-grafite/30 px-2 text-sm text-grafite'
                      }
                    >
                      {tamanho}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-grafite/60">Sob encomenda.</p>
            </div>
          )}
```

- [ ] **Step 3: Texto do botão**

Trocar o conteúdo do botão final. De:

```tsx
            {esgotado ? 'Esgotado' : 'Adicionar à sacola'}
```

Para:

```tsx
            {esgotado ? 'Esgotado' : precisaEscolher ? 'Escolha o tamanho' : 'Adicionar à sacola'}
```

- [ ] **Step 4: Conferir no navegador**

Run (em `loja/`): `npx tsc --noEmit`. Expected: sem erro.

Run (em `loja/`): `npm run dev`, abrir `http://localhost:3000/produto/top-tanga-sand` e conferir:

1. Abaixo de "Tamanho" com P/M/G/GG aparece "Linha kids" com 4/6/8/10/12 e "Sob encomenda." embaixo.
2. Clicar em "6" do kids: o "6" fica preenchido e o "P" adulto desmarca. Clicar em "M": o "6" desmarca.
3. Com "6" kids marcado, "Adicionar à sacola" abre a sacola com "Tamanho Kids 6".
4. Editar temporariamente `data/produtos.ts` deixando o primeiro produto com todos os adultos `disponivel: false` (trocar `grade(ADULTO)` por `ADULTO.map((tamanho) => ({ tamanho, disponivel: false }))` só nele). Recarregar: P/M/G/GG riscados, kids clicável, botão diz "Escolha o tamanho" e habilita ao clicar num kids. Desfazer a edição.

Parar o `npm run dev` antes do próximo step.

- [ ] **Step 5: Commit**

```bash
git add loja/components/ProductDetail.tsx
git commit -m "feat(loja): bloco Linha kids na pagina do produto

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Card da vitrine reconhece kids

O card calcula "esgotado" sozinho e ignoraria kids: um produto com adulto todo esgotado e kids ligado ficaria com selo "Esgotado" e botão travado, contradizendo a página. O card passa a usar `temEstoque` e oferece a fileira kids no seletor rápido.

**Files:**
- Modify: `loja/components/ProductCard.tsx`

**Interfaces:**
- Consumes: `temEstoque` (Task 1); `rotuloKids`, `tamanhosKids`, `temVariante` (Task 2).

- [ ] **Step 1: Imports e cálculo**

Em `loja/components/ProductCard.tsx`, trocar:

```tsx
import { formatarCentavos } from '@/lib/preco'
import { useSacola } from '@/components/CartProvider'
```

por:

```tsx
import { formatarCentavos } from '@/lib/preco'
import { temEstoque } from '@/lib/catalogo'
import { rotuloKids, tamanhosKids, temVariante } from '@/lib/variantes'
import { useSacola } from '@/components/CartProvider'
```

E trocar:

```tsx
  const foto = produto.imagens[0]
  const disponiveis = produto.tamanhos.filter((t) => t.disponivel)
  const esgotado = produto.tamanhos.length > 0 && disponiveis.length === 0
```

por:

```tsx
  const foto = produto.imagens[0]
  const kids = tamanhosKids(produto)
  const esgotado = !temEstoque(produto)
```

- [ ] **Step 2: O clique abre o seletor quando há qualquer variante**

Trocar:

```tsx
  // peca com tamanho pede a escolha antes de entrar na sacola
  function aoClicar() {
    if (produto.tamanhos.length) setEscolhendoTamanho((v) => !v)
    else adicionarNaSacola()
  }
```

por:

```tsx
  // peca com tamanho (adulto ou kids) pede a escolha antes de entrar na sacola
  function aoClicar() {
    if (temVariante(produto)) setEscolhendoTamanho((v) => !v)
    else adicionarNaSacola()
  }
```

- [ ] **Step 3: Seletor rápido com a fileira kids**

Trocar o bloco do seletor. De:

```tsx
        {escolhendoTamanho && produto.tamanhos.length ? (
          <div className="flex gap-1">
            {produto.tamanhos.map(({ tamanho, disponivel }) => (
              <button
                key={tamanho}
                type="button"
                disabled={!disponivel}
                onClick={() => adicionarNaSacola(tamanho)}
                aria-label={disponivel ? `Adicionar tamanho ${tamanho}` : `Tamanho ${tamanho} esgotado`}
                className={
                  disponivel
                    ? 'flex-1 border border-terra py-2 text-xs text-terra transition hover:border-laranja hover:bg-laranja hover:text-grafite'
                    : 'flex-1 cursor-not-allowed border border-grafite/15 py-2 text-xs text-grafite/30 line-through'
                }
              >
                {tamanho}
              </button>
            ))}
          </div>
        ) : (
```

Para:

```tsx
        {escolhendoTamanho && temVariante(produto) ? (
          <div className="space-y-1">
            {produto.tamanhos.length > 0 && (
              <div className="flex gap-1">
                {produto.tamanhos.map(({ tamanho, disponivel }) => (
                  <button
                    key={tamanho}
                    type="button"
                    disabled={!disponivel}
                    onClick={() => adicionarNaSacola(tamanho)}
                    aria-label={disponivel ? `Adicionar tamanho ${tamanho}` : `Tamanho ${tamanho} esgotado`}
                    className={
                      disponivel
                        ? 'flex-1 border border-terra py-2 text-xs text-terra transition hover:border-laranja hover:bg-laranja hover:text-grafite'
                        : 'flex-1 cursor-not-allowed border border-grafite/15 py-2 text-xs text-grafite/30 line-through'
                    }
                  >
                    {tamanho}
                  </button>
                ))}
              </div>
            )}
            {kids.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-8 text-[10px] uppercase tracking-wide text-grafite/60">kids</span>
                {kids.map((tamanho) => (
                  <button
                    key={tamanho}
                    type="button"
                    onClick={() => adicionarNaSacola(rotuloKids(tamanho))}
                    aria-label={`Adicionar tamanho kids ${tamanho}`}
                    className="flex-1 border border-terra py-2 text-xs text-terra transition hover:border-laranja hover:bg-laranja hover:text-grafite"
                  >
                    {tamanho}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
```

- [ ] **Step 4: Conferir**

Run (em `loja/`): `npx tsc --noEmit`. Expected: sem erro.

Run (em `loja/`): `npm run dev`, abrir `http://localhost:3000/biquinis`:

1. Clicar "Adicionar à sacola" num card: aparece a fileira P/M/G/GG e, embaixo, "kids" com 4/6/8/10/12.
2. Clicar no "8" kids: a sacola abre com "Tamanho Kids 8".

Parar o `npm run dev`.

- [ ] **Step 5: Commit**

```bash
git add loja/components/ProductCard.tsx
git commit -m "feat(loja): card da vitrine oferece kids e nao trava com adulto esgotado

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Documentação, build e verificação da saída estática

**Files:**
- Modify: `docs/decisoes.md` (decisão 8)
- Modify: `docs/runbook-caue.md:44-45` e a lista de pendências/verificações
- Modify: `README.md:47`
- Modify: `docs/stack.md` (Vitest entra na lista)

- [ ] **Step 1: Decisão 8**

Em `docs/decisoes.md`, trocar o parágrafo "Por quê" da decisão 8. De:

```
**Por quê.** A Linha Kids não usa P/M/G/GG, usa idade (2/4/6/8/10). Uma grade
fixa quebraria a categoria inteira e a correção viraria migração com o catálogo
já povoado.
```

Para:

```
**Por quê.** Nem toda peça usa P/M/G/GG, e uma grade fixa viraria migração
com o catálogo já povoado no dia em que a primeira exceção aparecer.

**Kids não é grade, é variante.** A Linha Kids começou como categoria própria e
saiu (11/09/2026): a Eme Praia faz sob encomenda, então o mesmo biquíni sai em
adulto e em kids. Cada produto tem um `temKids` sim/não. Os tamanhos kids
(4/6/8/10/12) são fixos em `loja.config.ts` e **nunca esgotam**, porque sob
encomenda não tem estoque pra acabar. Na sacola o tamanho vai como `Kids 6`,
pra Mayara ler certo no pedido. Spec:
`docs/superpowers/specs/2026-09-11-linha-kids-como-variante-design.md`.
```

- [ ] **Step 2: Runbook**

Em `docs/runbook-caue.md`, trocar:

```
      3 categorias, 17 produtos e o banner do meio da home.
      Falta: fotos de produto, capa das 3 categorias e foto do banner.
```

por:

```
      2 categorias, 17 produtos e o banner do meio da home.
      Falta: fotos de produto, capa das 2 categorias e foto do banner.
```

Na lista "Pendências antes do lançamento", logo depois da linha do `loja.config.ts` (WhatsApp, Instagram e domínio), adicionar:

```
- [ ] `loja.config.ts`: confirmar com a Mayara a grade kids (`gradeKids`,
      hoje 4/6/8/10/12) e se toda peça sai em kids (senão, desligar
      `temKids` nas que não saem)
```

Na seção "Verificações que valem repetir a cada mudança grande", adicionar um item à lista:

```
- Produto com adulto todo esgotado e `temKids: true` **não** aparece como
  esgotado; a fileira "Linha kids" continua clicável
```

E trocar o bloco de comando dessa seção de `cd loja && npm run build` para:

```bash
cd loja && npm test && npm run build
```

- [ ] **Step 3: README e stack**

Em `README.md`, trocar:

```
| `app/[categoria]/` | Uma rota só serve `/biquinis`, `/maio`, `/linha-kids` e as futuras |
```

por:

```
| `app/[categoria]/` | Uma rota só serve `/biquinis`, `/maio` e as futuras |
```

Em `docs/stack.md`, na tabela "Ferramentas de apoio", adicionar a linha depois do ESLint:

```
| **Vitest** 3 | | Roda os testes de `loja/lib/*.test.ts`. Só lógica pura: não há teste de componente nem de navegador. `npm test`. |
```

- [ ] **Step 4: Build e checagem do `out/`**

Run (em `loja/`, sem `npm run dev` aberto):

```bash
rm -rf .next out && npm test && npm run build
```

Expected: testes `13 passed`; build termina com a lista de rotas, sem `/linha-kids`.

Run (em `loja/`):

```bash
ls out/linha-kids.html 2>&1 | head -1
grep -c "linha-kids" out/sitemap.xml
grep -o "Linha kids" out/produto/top-tanga-sand.html | head -1
grep -o "Linha Kids" out/index.html | head -1
```

Expected, linha a linha:
1. `ls: cannot access 'out/linha-kids.html': No such file or directory`
2. `0`
3. `Linha kids`
4. (vazio: o menu e a grade de categorias não mostram mais a Linha Kids)

- [ ] **Step 5: Commit**

```bash
git add docs/decisoes.md docs/runbook-caue.md README.md docs/stack.md
git commit -m "docs: linha kids como variante — decisao 8, runbook, stack

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Run: `git status --short`
Expected: vazio (`out/` e `.next` já estão no `.gitignore` de `loja/`).
