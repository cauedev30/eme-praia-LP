import { Hono } from 'hono'
import { api } from './api'
import { exigirSenha, login, type Env, type Variaveis } from './login'

// Painel de gestao da Eme Praia. Tudo que nao e /entrar passa por
// exigirSenha antes de qualquer rota (decisao 11). As rotas de estoque e a
// API de escrita entram nas proximas tasks.

export type { Env, Variaveis }

export const app = new Hono<{ Bindings: Env; Variables: Variaveis }>()

app.use('*', exigirSenha)
app.route('/', login)
app.route('/api', api)

app.get('/', (c) => c.text('Painel Eme Praia: em construcao.'))

export default app
