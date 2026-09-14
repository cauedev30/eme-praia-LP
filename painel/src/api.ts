import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env, Variaveis } from './login'

// API de escrita do painel. Duas rotas, uma coluna cada. Disponibilidade e
// booleano, nunca quantidade (decisao 2). Nada aqui apaga: arquivar e Fase 3.

export const api = new Hono<{ Bindings: Env; Variables: Variaveis }>()

// strict(): campo a mais vira 400 em vez de ser ignorado em silencio. Um
// erro de digitacao no script do painel aparece, em vez de virar toque que
// nao faz nada.
const CorpoDisponivel = z.object({ disponivel: z.boolean() }).strict()
const CorpoKids = z.object({ temKids: z.boolean() }).strict()

// O EXISTS evita marcar o produto como atualizado quando o tamanho pedido
// nao existe: sem ele, um 404 ainda deixava rastro no atualizado_em.
const SQL_TOCAR_PRODUTO = `UPDATE produtos SET atualizado_em = datetime('now')
   WHERE id = ?1 AND EXISTS (SELECT 1 FROM tamanhos WHERE produto_id = ?1 AND tamanho = ?2)`

api.patch('/produtos/:id/tamanhos/:tamanho', zValidator('json', CorpoDisponivel), async (c) => {
  const { id, tamanho } = c.req.param()
  const { disponivel } = c.req.valid('json')

  const [resultado] = await c.env.DB.batch([
    c.env.DB.prepare('UPDATE tamanhos SET disponivel = ? WHERE produto_id = ? AND tamanho = ?').bind(
      disponivel ? 1 : 0,
      id,
      tamanho,
    ),
    c.env.DB.prepare(SQL_TOCAR_PRODUTO).bind(id, tamanho),
  ])

  if (resultado.meta.changes === 0) return c.json({ erro: 'tamanho nao encontrado' }, 404)
  return c.json({ disponivel })
})

api.patch('/produtos/:id', zValidator('json', CorpoKids), async (c) => {
  const { id } = c.req.param()
  const { temKids } = c.req.valid('json')

  const resultado = await c.env.DB.prepare(
    `UPDATE produtos SET tem_kids = ?, atualizado_em = datetime('now') WHERE id = ?`,
  )
    .bind(temKids ? 1 : 0, id)
    .run()

  if (resultado.meta.changes === 0) return c.json({ erro: 'produto nao encontrado' }, 404)
  return c.json({ temKids })
})
