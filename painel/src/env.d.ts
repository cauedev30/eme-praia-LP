// Forma dos bindings pro runtime e pros testes. A fonte e o Env de
// src/login.tsx; aqui so entra o que so existe em teste.
import type { Env as EnvDoLogin } from './login'

declare global {
  namespace Cloudflare {
    interface Env extends EnvDoLogin {
      TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
    }
  }
}
