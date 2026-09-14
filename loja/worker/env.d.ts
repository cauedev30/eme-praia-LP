// Bindings do Worker da loja, como declarados em loja/wrangler.jsonc.
// TEST_MIGRATIONS so existe nos testes (vitest.worker.config.ts).
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    ASSETS: Fetcher
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }

  // Diz quem e o modulo principal, pra `exports` de 'cloudflare:workers'
  // saber que tem um `default` (usado em index.test.ts).
  interface GlobalProps {
    mainModule: typeof import('./index')
  }
}
