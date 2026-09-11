'use client'

import { useRouter } from 'next/navigation'

export default function BackButton({
  fallback = '/',
  label = 'Voltar',
}: {
  fallback?: string
  label?: string
}) {
  const router = useRouter()

  // volta pra de onde veio; se caiu direto no link, usa o destino de reserva
  function voltar() {
    if (window.history.length > 1) router.back()
    else router.push(fallback)
  }

  return (
    <button
      type="button"
      onClick={voltar}
      className="mb-6 flex items-center gap-2 text-sm text-grafite/60 transition-colors hover:text-grafite"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
        <line x1="20" y1="12" x2="5" y2="12" />
        <polyline points="11 6 5 12 11 18" />
      </svg>
      {label}
    </button>
  )
}
