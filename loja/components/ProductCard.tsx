'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Produto } from '@/lib/tipos'
import { formatarCentavos } from '@/lib/preco'
import { useSacola } from '@/components/CartProvider'
import ImagemSlot from '@/components/ImagemSlot'

export default function ProductCard({ produto }: { produto: Produto }) {
  const { adicionar } = useSacola()
  const [escolhendoTamanho, setEscolhendoTamanho] = useState(false)

  const foto = produto.imagens[0]
  const disponiveis = produto.tamanhos.filter((t) => t.disponivel)
  const esgotado = produto.tamanhos.length > 0 && disponiveis.length === 0

  function adicionarNaSacola(tamanho?: string) {
    adicionar({
      produtoId: produto.id,
      slug: produto.slug,
      nome: produto.nome,
      imagem: foto,
      precoPixCentavos: produto.precoPixCentavos,
      tamanho,
      quantidade: 1,
    })
    setEscolhendoTamanho(false)
  }

  // peca com tamanho pede a escolha antes de entrar na sacola
  function aoClicar() {
    if (produto.tamanhos.length) setEscolhendoTamanho((v) => !v)
    else adicionarNaSacola()
  }

  return (
    <div className="flex h-full flex-col">
      <Link href={`/produto/${produto.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-grafite/5">
          {foto ? (
            <img
              src={foto}
              alt={produto.nome}
              width={432}
              height={540}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover ${esgotado ? 'opacity-60' : ''}`}
            />
          ) : (
            <ImagemSlot rotulo="Foto do produto" />
          )}
          {esgotado && (
            <span className="absolute left-2 top-2 bg-grafite/80 px-2 py-1 text-[10px] uppercase tracking-wide text-gelo">
              Esgotado
            </span>
          )}
        </div>
        <div className="mt-3 space-y-1">
          <p className="line-clamp-2 min-h-[2.5rem] text-sm">{produto.nome}</p>
          <p className="text-sm">{formatarCentavos(produto.precoPixCentavos)}</p>
        </div>
      </Link>

      <div className="mt-auto pt-3">
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
          <button
            type="button"
            onClick={aoClicar}
            disabled={esgotado}
            className={
              esgotado
                ? 'w-full cursor-not-allowed bg-grafite/15 py-2 text-xs uppercase tracking-wide text-grafite/40'
                : 'w-full border border-grafite py-2 text-xs uppercase tracking-wide text-grafite transition hover:border-laranja hover:bg-laranja'
            }
          >
            {esgotado ? 'Esgotado' : 'Adicionar à sacola'}
          </button>
        )}
      </div>
    </div>
  )
}
