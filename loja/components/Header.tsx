import Link from 'next/link'
import CartButton from '@/components/CartButton'
import { getCategorias } from '@/lib/catalogo'
import { loja } from '@/loja.config'

export default async function Header() {
  // O menu vem das categorias — categoria nova aparece aqui sozinha, sem
  // ninguem lembrar de editar uma lista fixa.
  const categorias = await getCategorias()

  return (
    <header className="border-b border-grafite/10 bg-gelo">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 md:py-4">
        <Link href="/" className="flex items-center">
          <img src="/logo/eme-logo.webp" alt={loja.nome} width={500} height={500} className="h-20 w-auto md:h-28" />
        </Link>
        <nav className="hidden gap-6 text-sm uppercase tracking-wide text-grafite md:flex">
          <Link href="/#promocao" className="hover:text-terra">
            Promoção
          </Link>
          {categorias.map((categoria) => (
            <Link key={categoria.id} href={`/${categoria.slug}`} className="hover:text-terra">
              {categoria.nome}
            </Link>
          ))}
        </nav>
        <div className="flex items-center">
          <CartButton />
        </div>
      </div>
    </header>
  )
}
