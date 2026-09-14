import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

// Testes do Worker (worker/*.test.ts) rodam dentro do workerd, com um D1 em
// memoria que recebe as migrations de painel/migrations (schema + seed).
// Os testes de lib/ continuam no vitest.config.ts, em Node.
const raiz = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(async () => {
  // wrangler.jsonc aponta assets pra ./out; o diretorio precisa existir
  // mesmo sem build, senao o plugin recusa a config.
  mkdirSync(path.join(raiz, 'out'), { recursive: true })

  const migrations = await readD1Migrations(path.join(raiz, '..', 'painel', 'migrations'))

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      }),
    ],
    test: {
      include: ['worker/**/*.test.ts'],
      setupFiles: ['./worker/apply-migrations.ts'],
    },
  }
})
