import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

// Os testes rodam dentro do workerd com um D1 em memoria que recebe as
// migrations desta pasta (schema + seed).
const raiz = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(raiz, 'migrations'))
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      }),
    ],
    test: {
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      setupFiles: ['./src/apply-migrations.ts'],
    },
  }
})
