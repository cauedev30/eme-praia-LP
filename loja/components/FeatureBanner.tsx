import Link from 'next/link'
import ImagemSlot from '@/components/ImagemSlot'

export default function FeatureBanner() {
  return (
    <section className="relative flex h-[80svh] min-h-[520px] items-start overflow-hidden bg-breu pt-14 text-white md:items-center md:pt-0">
      <div className="absolute inset-0">
        <ImagemSlot rotulo="Foto do banner" tom="escuro" />
      </div>
      <div className="relative ml-auto max-w-md px-6 text-right md:px-10">
        <h2 className="font-serif text-xl italic md:text-5xl">Seu verão começa aqui.</h2>
        <Link
          href="/biquinis"
          className="mt-3 inline-block border-b border-white pb-1 text-[10px] uppercase tracking-widest hover:border-laranja hover:text-laranja md:mt-6 md:text-xs"
        >
          Confira a coleção completa
        </Link>
      </div>
    </section>
  )
}
