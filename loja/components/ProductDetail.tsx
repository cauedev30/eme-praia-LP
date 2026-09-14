'use client'

import { useState } from 'react'
import type { Produto } from '@/lib/tipos'
import { formatarCentavos, parcelamento } from '@/lib/preco'
import { temEstoque } from '@/lib/estoque'
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

  function adicionarNaSacola() {
    if (!podeAdicionar) return
    adicionar({
      produtoId: produto.id,
      slug: produto.slug,
      nome: produto.nome,
      imagem: produto.imagens[0],
      precoPixCentavos: produto.precoPixCentavos,
      tamanho: tamanhoSelecionado,
      quantidade,
    })
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <BackButton fallback={`/${produto.categoria}`} />
      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-3">
          {produto.imagens.length === 0 ? (
            <div className="aspect-[4/5] overflow-hidden">
              <ImagemSlot rotulo="Foto do produto" />
            </div>
          ) : (
            produto.imagens.map((imagem, i) => (
              <div key={imagem} className="aspect-[4/5] overflow-hidden bg-grafite/5">
                <img
                  src={imagem}
                  alt={`${produto.nome}${i > 0 ? ` — foto ${i + 1}` : ''}`}
                  width={860}
                  height={1075}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
            ))
          )}
        </div>

        <div className="space-y-6">
          <h1 className="font-serif text-2xl text-grafite">{produto.nome}</h1>

          <div>
            <p className="text-2xl text-grafite">{formatarCentavos(produto.precoPixCentavos)}</p>
            <p className="mt-1 text-sm text-grafite/60">no Pix</p>
            <p className="mt-2 text-sm text-grafite/60">
              ou {formatarCentavos(produto.precoCentavos)} em{' '}
              {parcelamento(produto.precoCentavos)} no cartão
            </p>
          </div>

          {produto.descricao && (
            <p className="text-sm leading-relaxed text-grafite/80">{produto.descricao}</p>
          )}

          {temGrade && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-grafite/60">Tamanho</p>
              <div className="flex gap-2">
                {produto.tamanhos.map(({ tamanho, disponivel }) => (
                  <button
                    key={tamanho}
                    type="button"
                    disabled={!disponivel}
                    onClick={() => setTamanhoSelecionado(tamanho)}
                    aria-label={disponivel ? `Tamanho ${tamanho}` : `Tamanho ${tamanho} esgotado`}
                    aria-pressed={tamanhoSelecionado === tamanho}
                    className={
                      !disponivel
                        ? 'h-9 min-w-9 cursor-not-allowed border border-grafite/15 px-2 text-sm text-grafite/30 line-through'
                        : tamanhoSelecionado === tamanho
                          ? 'h-9 min-w-9 border border-grafite bg-grafite px-2 text-sm text-gelo'
                          : 'h-9 min-w-9 border border-grafite/30 px-2 text-sm text-grafite'
                    }
                  >
                    {tamanho}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                      aria-pressed={tamanhoSelecionado === valor}
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

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-grafite/60">Quantidade</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                className="h-9 w-9 border border-grafite/30 text-grafite"
              >
                &minus;
              </button>
              <span className="w-6 text-center text-sm">{quantidade}</span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                onClick={() => setQuantidade((q) => q + 1)}
                className="h-9 w-9 border border-grafite/30 text-grafite"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={adicionarNaSacola}
            disabled={!podeAdicionar}
            className={
              podeAdicionar
                ? 'w-full bg-laranja py-3 text-sm uppercase tracking-widest text-grafite transition hover:bg-grafite hover:text-laranja'
                : 'w-full cursor-not-allowed bg-grafite/15 py-3 text-sm uppercase tracking-widest text-grafite/40'
            }
          >
            {esgotado ? 'Esgotado' : precisaEscolher ? 'Escolha o tamanho' : 'Adicionar à sacola'}
          </button>
        </div>
      </div>
    </main>
  )
}
