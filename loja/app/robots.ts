import type { MetadataRoute } from 'next'
import { loja } from '@/loja.config'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // O painel nunca deve ser indexado. O Cloudflare Access ja bloqueia na
      // borda, mas nao custa dizer.
      disallow: '/admin',
    },
    sitemap: `${loja.dominio}/sitemap.xml`,
  }
}
