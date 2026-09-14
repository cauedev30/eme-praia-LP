'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { aoVivo } from '@/lib/aoVivo'
import type { MapaDisponibilidade, Produto } from '@/lib/tipos'

// A decisao 3 no navegador. Busca /api/disponibilidade.json (mesmo host do
// Worker da loja) a cada troca de pagina e entrega, via useProdutoAoVivo,
// o produto com tamanhos e temKids corrigidos. Se o fetch falhar (ex.:
// `next dev` sem o Worker), o mapa fica vazio e vale o build. Nao e erro.

const Ctx = createContext<MapaDisponibilidade>({})

function ehMapa(v: unknown): v is MapaDisponibilidade {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export default function DisponibilidadeProvider({ children }: { children: React.ReactNode }) {
  const [mapa, setMapa] = useState<MapaDisponibilidade>({})
  const pathname = usePathname()

  useEffect(() => {
    const controle = new AbortController()
    fetch('/api/disponibilidade.json', { signal: controle.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => {
        if (ehMapa(corpo)) setMapa(corpo)
      })
      .catch(() => {})
    return () => controle.abort()
  }, [pathname])

  return <Ctx.Provider value={mapa}>{children}</Ctx.Provider>
}

export function useProdutoAoVivo(produto: Produto): Produto {
  const mapa = useContext(Ctx)
  return useMemo(() => aoVivo(produto, mapa), [produto, mapa])
}
