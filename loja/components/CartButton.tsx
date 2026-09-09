'use client'

import { useSacola } from '@/components/CartProvider'

export default function CartButton() {
  const { quantidadeTotal, abrir } = useSacola()

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={`Abrir sacola (${quantidadeTotal} ${quantidadeTotal === 1 ? 'item' : 'itens'})`}
      className="relative flex h-11 w-11 items-center justify-center rounded-full bg-bronze/10 text-bronze transition-colors hover:bg-bronze hover:text-creme"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-[22px] w-[22px]" aria-hidden="true">
        <path d="M6 8h12l-1 12H7L6 8z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {quantidadeTotal > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bronze px-1 text-[11px] font-medium text-creme ring-2 ring-creme">
          {quantidadeTotal}
        </span>
      )}
    </button>
  )
}
