// O `output: 'export'` quebra o `next dev` no Next 14: as rotas dinamicas e as
// rotas de metadata (sitemap.xml) respondem 500 com "missing generateStaticParams",
// mesmo com a funcao exportada. O build de producao funciona normal.
//
// Entao ele so entra no build. `next build` roda com NODE_ENV=production;
// `next dev`, com development. O build de publicacao continua sendo estatico —
// e ele que gera o que vai pra Cloudflare.
const exportarEstatico = process.env.NODE_ENV === 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export estatico: nenhum adaptador de Next.js na Cloudflare. Os adaptadores
  // mudaram tres vezes em 18 meses (next-on-pages -> OpenNext -> vinext) e o
  // suporte a Next 14 ja foi dropado. Arquivo HTML nao e descontinuado.
  ...(exportarEstatico ? { output: 'export' } : {}),
  trailingSlash: false,
  // O otimizador do next/image nao roda em export. As dimensoes passam a ser
  // controladas no upload, e as <img> levam width/height pra matar CLS.
  images: { unoptimized: true },
}

export default nextConfig
