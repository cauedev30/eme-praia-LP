import Link from 'next/link'
import { INSTAGRAM_URL, linkWhatsApp } from '@/lib/loja'
import { loja } from '@/loja.config'


function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-6 w-6" aria-hidden="true">
      <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.4-4.3a8.5 8.5 0 1 1 15.6-4.5z" strokeLinejoin="round" />
      <path d="M9.2 8.2c.3-.1.6 0 .8.3l.8 1.3c.1.2.1.5 0 .7l-.5.7c.5 1 1.3 1.8 2.3 2.3l.7-.5c.2-.1.5-.2.7 0l1.3.8c.3.2.4.5.3.8-.3.8-1.1 1.3-1.9 1.2-2.9-.4-5.2-2.7-5.6-5.6-.1-.8.3-1.6 1.1-2z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="border-t border-carvao/10 bg-areia">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-14">
        <Link href="/" aria-label={`${loja.nome} — página inicial`}>
          <img src="/logo/eme-lettering.webp" alt={loja.nome} width={686} height={86} className="h-auto w-64 md:w-96" />
        </Link>
        <div className="flex items-center gap-4">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Instagram da ${loja.nome}`}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-carvao/15 text-carvao/70 transition-colors hover:border-bronze hover:text-bronze"
          >
            <IconInstagram />
          </a>
          <a
            href={linkWhatsApp()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp da ${loja.nome}`}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-carvao/15 text-carvao/70 transition-colors hover:border-bronze hover:text-bronze"
          >
            <IconWhatsApp />
          </a>
        </div>
      </div>
    </footer>
  )
}
