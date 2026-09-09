'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { formatarCentavos } from '@/lib/preco'
import { loja } from '@/loja.config'

export type ItemSacola = {
  produtoId: string
  slug: string
  nome: string
  imagem?: string
  precoPixCentavos: number
  tamanho?: string
  quantidade: number
}

const CHAVE_STORAGE = 'eme-sacola'

// Sem cor: a Eme Praia so tem variante de tamanho.
export function chaveDoItem(item: ItemSacola) {
  return `${item.produtoId}|${item.tamanho ?? ''}`
}

export function montarMensagem(itens: ItemSacola[], total: number) {
  const linhas = itens.map((item, i) => {
    const detalhes = [item.tamanho && `Tamanho ${item.tamanho}`, `Qtd ${item.quantidade}`]
      .filter(Boolean)
      .join(' \u00b7 ')
    // O link vai junto pra Mayara achar a peca na arara sem adivinhar.
    return [
      `${i + 1}. ${item.nome}`,
      `   ${detalhes} \u2014 ${formatarCentavos(item.precoPixCentavos * item.quantidade)}`,
      `   ${loja.dominio}/produto/${item.slug}`,
    ].join('\n')
  })
  return `Ol\u00e1! Quero fechar esse pedido pelo site:\n\n${linhas.join('\n\n')}\n\nTotal: ${formatarCentavos(total)}`
}

type Sacola = {
  itens: ItemSacola[]
  quantidadeTotal: number
  valorTotal: number
  aberta: boolean
  abrir: () => void
  fechar: () => void
  adicionar: (item: ItemSacola) => void
  alterarQuantidade: (chave: string, delta: number) => void
  remover: (chave: string) => void
  limpar: () => void
}

const SacolaContext = createContext<Sacola | null>(null)

export function useSacola() {
  const ctx = useContext(SacolaContext)
  if (!ctx) throw new Error('useSacola precisa estar dentro de <CartProvider>')
  return ctx
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemSacola[]>([])
  const [aberta, setAberta] = useState(false)
  const [hidratada, setHidratada] = useState(false)

  // a sacola sobrevive a recarregar a pagina
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE)
      if (salvo) setItens(JSON.parse(salvo))
    } catch {
      // storage indisponivel (aba anonima, etc) — segue com sacola vazia
    }
    setHidratada(true)
  }, [])

  useEffect(() => {
    if (!hidratada) return
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(itens))
    } catch {
      // nada a fazer — a sacola so nao persiste
    }
  }, [itens, hidratada])

  const adicionar = useCallback((novo: ItemSacola) => {
    setItens((atuais) => {
      const chave = chaveDoItem(novo)
      const existente = atuais.find((i) => chaveDoItem(i) === chave)
      if (!existente) return [...atuais, novo]
      return atuais.map((i) =>
        chaveDoItem(i) === chave ? { ...i, quantidade: i.quantidade + novo.quantidade } : i
      )
    })
    setAberta(true)
  }, [])

  const alterarQuantidade = useCallback((chave: string, delta: number) => {
    setItens((atuais) =>
      atuais
        .map((i) =>
          chaveDoItem(i) === chave ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i
        )
        .filter((i) => i.quantidade > 0)
    )
  }, [])

  const remover = useCallback((chave: string) => {
    setItens((atuais) => atuais.filter((i) => chaveDoItem(i) !== chave))
  }, [])

  const limpar = useCallback(() => setItens([]), [])

  const valor = useMemo<Sacola>(
    () => ({
      itens,
      quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0),
      valorTotal: itens.reduce((s, i) => s + i.precoPixCentavos * i.quantidade, 0),
      aberta,
      abrir: () => setAberta(true),
      fechar: () => setAberta(false),
      adicionar,
      alterarQuantidade,
      remover,
      limpar,
    }),
    [itens, aberta, adicionar, alterarQuantidade, remover, limpar]
  )

  return <SacolaContext.Provider value={valor}>{children}</SacolaContext.Provider>
}
