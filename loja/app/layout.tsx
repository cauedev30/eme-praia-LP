import type { Metadata } from 'next'
import { Fraunces, Jost } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartProvider from '@/components/CartProvider'
import CartDrawer from '@/components/CartDrawer'
import CartBar from '@/components/CartBar'
import { jsonLdLoja, ScriptJsonLd } from '@/lib/jsonld'
import { loja } from '@/loja.config'

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
})
const jost = Jost({ subsets: ['latin'], variable: '--font-jost' })

export const metadata: Metadata = {
  metadataBase: new URL(loja.dominio),
  // O %s e preenchido pelo title de cada pagina; a home usa o default.
  title: { default: loja.nome, template: `%s` },
  description: loja.descricao,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${fraunces.variable} ${jost.variable} font-sans bg-gelo text-grafite`}>
        <ScriptJsonLd dados={jsonLdLoja()} />
        <CartProvider>
          <Header />
          {children}
          <Footer />
          <CartBar />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  )
}
