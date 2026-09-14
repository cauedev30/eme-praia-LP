import { Hono } from 'hono'
import { lerCatalogo, lerDisponibilidade } from './consultas'

// Worker da loja: serve loja/out como assets (configurado em wrangler.jsonc,
// antes deste codigo rodar) e a API de LEITURA do catalogo. Nada aqui
// escreve no banco; a escrita e do Worker do painel.

type Env = {
  DB: D1Database
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Env }>()

// Consumida so pelo `next build`. Sem cache: o build precisa do estado
// atual, e ninguem mais chama isso em volume.
app.get('/api/catalogo.json', async (c) => {
  const catalogo = await lerCatalogo(c.env.DB)
  return c.json(catalogo, 200, { 'Cache-Control': 'no-store' })
})

// Consumida pelo navegador em toda carga de pagina (DisponibilidadeProvider).
// 30 s de cache na borda e no navegador: e o "reflete em ate 30 s" da
// decisao 3, e o que impede um dia de praia de virar milhares de SELECTs.
app.get('/api/disponibilidade.json', async (c) => {
  const mapa = await lerDisponibilidade(c.env.DB)
  return c.json(mapa, 200, { 'Cache-Control': 'public, max-age=30, s-maxage=30' })
})

app.onError((erro, c) => {
  console.error('catalogo: erro no banco', erro)
  return c.json({ erro: 'falha ao ler o catalogo' }, 500)
})

// Tudo que nao e API volta pros assets, que aplicam o not_found_handling
// (a 404.html do Next).
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw))

export default app
