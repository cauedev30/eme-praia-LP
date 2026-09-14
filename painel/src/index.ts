import { Hono } from 'hono'

// Painel de gestao. Nesta fase o Worker so existe pra que `wrangler` tenha
// um `main` e as migrations possam ser aplicadas. As rotas (tela de estoque,
// API de escrita, middleware do Access) entram na Fase 2.

export type Env = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => c.text('Painel Eme Praia: em construcao (Fase 2).'))

export default app
