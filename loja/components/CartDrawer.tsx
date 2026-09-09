'use client'

import { useEffect, useState } from 'react'
import { chaveDoItem, montarMensagem, useSacola } from '@/components/CartProvider'
import { linkWhatsApp } from '@/lib/loja'
import { formatarCentavos } from '@/lib/preco'
import ImagemSlot from '@/components/ImagemSlot'

export default function CartDrawer() {
  const { itens, valorTotal, aberta, fechar, alterarQuantidade, remover, limpar } = useSacola()
  const [enviado, setEnviado] = useState(false)

  // trava o scroll do fundo e permite fechar no Esc
  useEffect(() => {
    if (!aberta) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', onKey)
    }
  }, [aberta, fechar])

  // volta ao estado normal quando a sacola e reaberta
  useEffect(() => {
    if (aberta) setEnviado(false)
  }, [aberta])

  if (!aberta) return null

  const vazia = itens.length === 0

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-carvao/40" onClick={fechar} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sacola"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-creme shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-carvao/10 px-6 py-4">
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar sacola"
            className="-ml-1 flex h-8 w-8 items-center justify-center text-carvao/70 transition-colors hover:text-carvao"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
              <line x1="20" y1="12" x2="5" y2="12" />
              <polyline points="11 6 5 12 11 18" />
            </svg>
          </button>
          <h2 className="font-serif text-lg text-carvao">Sacola</h2>
        </header>

        {enviado ? (
          // O pedido NAO limpa a sacola sozinho: se o handoff pro WhatsApp
          // falhar, o carrinho da cliente teria sido destruido por nada.
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="font-serif text-xl text-carvao">Pedido enviado no WhatsApp</p>
            <p className="text-sm text-carvao/60">
              Se a conversa não abriu, volte e toque de novo — sua sacola continua aqui.
            </p>
            <button
              type="button"
              onClick={() => {
                limpar()
                setEnviado(false)
                fechar()
              }}
              className="mt-2 border border-carvao px-6 py-2 text-xs uppercase tracking-widest text-carvao transition hover:bg-carvao hover:text-creme"
            >
              Limpar sacola
            </button>
          </div>
        ) : vazia ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-carvao/60">
            Sua sacola está vazia.
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-carvao/10 overflow-y-auto px-6">
            {itens.map((item) => {
              const chave = chaveDoItem(item)
              return (
                <li key={chave} className="flex gap-4 py-4">
                  <div className="h-24 w-20 flex-shrink-0">
                    {item.imagem ? (
                      <img
                        src={item.imagem}
                        alt={item.nome}
                        width={80}
                        height={96}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagemSlot />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-snug">{item.nome}</p>
                      <button
                        type="button"
                        onClick={() => remover(chave)}
                        aria-label={`Remover ${item.nome}`}
                        className="text-xs text-carvao/50 underline hover:text-carvao"
                      >
                        remover
                      </button>
                    </div>
                    {item.tamanho && (
                      <p className="text-xs text-carvao/60">Tamanho {item.tamanho}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(chave, -1)}
                          aria-label="Diminuir quantidade"
                          className="h-7 w-7 border border-carvao/30 text-carvao"
                        >
                          &minus;
                        </button>
                        <span className="w-5 text-center text-sm">{item.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(chave, 1)}
                          aria-label="Aumentar quantidade"
                          className="h-7 w-7 border border-carvao/30 text-carvao"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm">
                        {formatarCentavos(item.precoPixCentavos * item.quantidade)}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!enviado && (
          <footer className="border-t border-carvao/10 px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm uppercase tracking-wide text-carvao/60">Total no pix</span>
              <span className="text-lg">{formatarCentavos(valorTotal)}</span>
            </div>
            <a
              href={vazia ? undefined : linkWhatsApp(montarMensagem(itens, valorTotal))}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={vazia}
              onClick={() => !vazia && setEnviado(true)}
              className={`block w-full py-3 text-center text-sm uppercase tracking-widest transition ${
                vazia
                  ? 'pointer-events-none bg-carvao/20 text-creme'
                  : 'bg-bronze text-creme hover:bg-carvao'
              }`}
            >
              Fechar pedido no WhatsApp
            </a>
            <p className="mt-3 text-center text-xs text-carvao/50">
              O pedido abre no WhatsApp da loja já escrito. O pagamento é combinado por lá.
            </p>
          </footer>
        )}
      </aside>
    </div>
  )
}
