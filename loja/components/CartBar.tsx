'use client'

import { useSacola } from '@/components/CartProvider'
import { formatarCentavos } from '@/lib/preco'

export default function CartBar() {
  const { quantidadeTotal, valorTotal, aberta, abrir } = useSacola()

  if (quantidadeTotal === 0) return null

  return (
    <>
      {/* espaco no fim da pagina pra barra nao cobrir o rodape */}
      <div className="h-[76px]" aria-hidden="true" />
      {!aberta && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-carvao/10 bg-creme">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-carvao/60">
                {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'} na sacola
              </p>
              <p className="text-lg leading-tight">{formatarCentavos(valorTotal)}</p>
            </div>
            <button
              type="button"
              onClick={abrir}
              className="bg-bronze px-6 py-3 text-sm uppercase tracking-widest text-creme transition hover:bg-carvao"
            >
              Finalizar pedido
            </button>
          </div>
        </div>
      )}
    </>
  )
}
