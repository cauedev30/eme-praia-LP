import { env } from 'cloudflare:workers'
import { NOME_COOKIE, criarCookie } from './sessao'

// Senha usada so nos testes. A de producao vive em secret e nunca aparece
// em arquivo versionado.
export const SENHA_TESTE = 'senha de teste do painel'

/** Bindings pra app.request(): o D1 em memoria mais a senha de teste. */
export const ambiente = () => ({ DB: env.DB, SENHA_PAINEL: SENHA_TESTE })

/** Headers com um cookie de sessao valido pra SENHA_TESTE. */
export async function comSessao(extras: Record<string, string> = {}): Promise<Record<string, string>> {
  const { valor } = await criarCookie(SENHA_TESTE)
  return { cookie: `${NOME_COOKIE}=${valor}`, ...extras }
}
