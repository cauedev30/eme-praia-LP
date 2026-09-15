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
  return c.html(<Tela categorias={categorias} produtos={produtos} urlLoja={c.env.URL_LOJA ?? ''} />)
})

// Sem isto o Hono responde "Internal Server Error" e nao escreve nada: o
// `wrangler tail eme-praia-painel` fica mudo justamente quando a Mayara
// liga dizendo que nao abre. Espelha o onError do Worker da loja.
app.onError((erro, c) => {
  console.error('painel: erro nao tratado', erro)
  return c.text('Deu erro aqui. Tenta de novo em um minuto.', 500)
})

export default app
