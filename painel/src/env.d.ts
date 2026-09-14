declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    SENHA_PAINEL?: string
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }
}
