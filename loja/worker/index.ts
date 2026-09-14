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
// E o "reflete em ate 30 s" da decisao 3.
//
// O max-age segura o navegador de quem ja carregou. Pra segurar visitante
// novo e preciso guardar na borda A MAO, com a Cache API: resposta que o
// Worker MONTA nao entra no cache da Cloudflare sozinha (so entra o que ele
// busca de uma origem), entao o s-maxage sozinho nao faria nada. Sem isso,
// um dia de praia vira um SELECT por visitante.
app.get('/api/disponibilidade.json', async (c) => {
  const cache = caches.default
  const chave = new Request(c.req.url)

  const guardada = await cache.match(chave)
  if (guardada) return guardada

  const mapa = await lerDisponibilidade(c.env.DB)
  const resposta = c.json(mapa, 200, { 'Cache-Control': 'public, max-age=30, s-maxage=30' })

  // clone() porque o corpo so pode ser lido uma vez, e waitUntil pra gravar
  // depois de responder, sem segurar a visitante. Falha ao guardar nao pode
  // virar erro: sem cache a resposta ja saiu certa.
  c.executionCtx.waitUntil(cache.put(chave, resposta.clone()).catch(() => {}))
  return resposta
})

// Mensagem neutra: as duas rotas caem aqui, e falar "catalogo" pra quem
// pediu disponibilidade manda a pessoa procurar no lugar errado.
app.onError((erro, c) => {
  console.error('loja: erro no banco', erro)
  return c.json({ erro: 'falha ao ler o banco' }, 500)
})

// Tudo que nao e API volta pros assets, que aplicam o not_found_handling
// (a 404.html do Next).
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw))

export default app
