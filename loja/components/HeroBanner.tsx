import Link from 'next/link'
import { loja } from '@/loja.config'

// A foto e de sol a pino: medindo o contraste do branco sobre ela, nenhuma
// regiao passa de 3:1 nos 5% de pixels mais claros. Ou seja, texto branco
// precisa de veu em qualquer canto — nao e escolha estetica. Estes dois
// gradientes levam a area da frase pra 5,3:1 na mediana e 2,9:1 no pior
// percentil, escurecendo o corpo da modelo em so 16%.
const VEU = [
  'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0) 72%)',
  'linear-gradient(to left, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%)',
].join(', ')

export default function HeroBanner() {
  return (
    <section className="relative h-[55svh] min-h-[360px] w-full overflow-hidden bg-grafite md:h-auto md:min-h-0 md:aspect-[1721/914] md:max-h-[85svh]">
      {/*
        A foto e deitada (1.88:1). No celular o recorte fica em pe, e centralizado
        ele corta justamente as pecas — sobra so a barriga. Por isso o foco vai
        pra 10% da esquerda, onde ficam o top e o colar.
      */}
      <img
        src="/hero/hero-1.webp"
        alt="Modelo de biquíni preto à beira da água"
        width={1721}
        height={914}
        fetchPriority="high"
        className="h-full w-full object-cover [object-position:10%_50%] md:[object-position:50%_50%]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: VEU }}
      />

      {/* O h1 continua invisivel: o titulo que interessa pro Google e a loja,
          nao a frase da campanha. */}
      <h1 className="sr-only">
        {loja.nome} — {loja.descricao}
      </h1>

      <div className="absolute bottom-7 right-6 max-w-[15rem] text-right md:bottom-12 md:right-12 md:max-w-md">
        <p className="font-serif text-[1.6rem] italic leading-[1.15] text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)] md:text-4xl lg:text-[3.25rem]">
          Seu verão começa aqui.
        </p>
        <Link
          href="/#promocao"
          className="mt-4 inline-block bg-laranja px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-grafite transition-colors hover:bg-grafite hover:text-laranja md:mt-7 md:px-8 md:py-3.5 md:text-xs"
        >
          Confira Coleção
        </Link>
      </div>
    </section>
  )
}
