import Link from 'next/link'
import { getCategorias } from '@/lib/catalogo'
import ImagemSlot from '@/components/ImagemSlot'

export default async function CategoryGrid() {
  const categorias = await getCategorias()
  const primeira = categorias[0]

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {categorias.map((categoria) => (
          <Link
            key={categoria.id}
            href={`/${categoria.slug}`}
            className="group relative block aspect-[4/5] overflow-hidden"
          >
            {categoria.imagem ? (
              <img
                src={categoria.imagem}
                alt={categoria.nome}
                width={432}
                height={540}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <ImagemSlot />
            )}
            <div
              className={`absolute inset-0 flex items-end justify-center pb-6 ${
                categoria.imagem ? 'bg-black/20' : ''
              }`}
            >
              <span
                className={`text-sm uppercase tracking-widest ${
                  categoria.imagem ? 'text-white' : 'text-carvao'
                }`}
              >
                {categoria.nome}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {primeira && (
        <div className="mt-6 text-center">
          <Link
            href={`/${primeira.slug}`}
            className="inline-block border border-carvao px-8 py-2 text-xs uppercase tracking-widest text-carvao hover:bg-carvao hover:text-creme"
          >
            Ver tudo
          </Link>
        </div>
      )}
    </section>
  )
}
