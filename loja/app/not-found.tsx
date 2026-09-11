import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-24 text-center">
      <h1 className="font-serif text-3xl text-grafite">Página não encontrada</h1>
      <p className="text-sm text-grafite/60">
        A peça que você procura pode ter saído do catálogo.
      </p>
      <Link
        href="/"
        className="inline-block border border-grafite px-8 py-2 text-xs uppercase tracking-widest text-grafite transition hover:bg-grafite hover:text-gelo"
      >
        Voltar pra loja
      </Link>
    </main>
  )
}
