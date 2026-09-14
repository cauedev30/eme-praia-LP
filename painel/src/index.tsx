import { Hono } from 'hono'
import { lerCatalogo } from '../../loja/worker/consultas'
import { api } from './api'
import { exigirSenha, login, type Env, type Variaveis } from './login'
import { Tela } from './tela'

// Painel de gestao da Eme Praia. Tudo que nao e /entrar passa por
// exigirSenha antes de qualquer rota (decisao 11). As rotas de estoque e a
// API de escrita entram nas proximas tasks.

export type { Env, Variaveis }

export const app = new Hono<{ Bindings: Env; Variables: Variaveis }>()

app.use('*', exigirSenha)
app.route('/', login)
app.route('/api', api)

app.get('/', async (c) => {
  const { categorias, produtos } = await lerCatalogo(c.env.DB)
  return c.html(<Tela categorias={categorias} produtos={produtos} />)
})

export default app
