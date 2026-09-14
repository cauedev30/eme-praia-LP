import { applyD1Migrations, reset } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { beforeEach } from 'vitest'

// Setup file: roda antes de cada teste. O plugin nao isola o armazenamento
// sozinho, entao o reset() limpa os bindings e as migrations de
// painel/migrations (schema + seed) sao reaplicadas do zero. Assim o UPDATE
// de um teste nao vaza pro seguinte.
beforeEach(async () => {
  await reset()
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
})
