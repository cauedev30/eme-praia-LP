// Login por senha (decisao 11). Nao existe tabela de sessao: o cookie se
// prova sozinho por HMAC, e a chave do HMAC e a propria senha. Consequencia
// de proposito: trocar SENHA_PAINEL invalida todo cookie ja emitido, o que
// faz as vezes de "sair de todos os aparelhos" sem escrever tela de logout.

export const NOME_COOKIE = 'sessao'
export const DURACAO_SEGUNDOS = 90 * 24 * 60 * 60

const bytes = (texto: string) => new TextEncoder().encode(texto)

/** Compara sem vazar tamanho nem prefixo: os dois viram 32 bytes antes.
 *  Comparar as strings direto daria pra medir acerto por caractere. */
export async function senhaConfere(enviada: string, certa: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', bytes(enviada)),
    crypto.subtle.digest('SHA-256', bytes(certa)),
  ])
  return crypto.subtle.timingSafeEqual(a, b)
}

function base64url(dados: ArrayBuffer): string {
  const binario = String.fromCharCode(...new Uint8Array(dados))
  return btoa(binario).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function assinar(expiraEm: number, senha: string): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', bytes(senha), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return base64url(await crypto.subtle.sign('HMAC', chave, bytes(String(expiraEm))))
}

/** Valor do cookie: `<expiraEm em segundos>.<assinatura>`. */
export async function criarCookie(
  senha: string,
  agora: number = Date.now(),
): Promise<{ valor: string; expiraEm: number }> {
  const expiraEm = Math.floor(agora / 1000) + DURACAO_SEGUNDOS
  return { valor: `${expiraEm}.${await assinar(expiraEm, senha)}`, expiraEm }
}

export async function cookieVale(
  valor: string | undefined,
  senha: string,
  agora: number = Date.now(),
): Promise<boolean> {
  if (!valor) return false

  const corte = valor.indexOf('.')
  if (corte < 1) return false

  const expiraEm = Number(valor.slice(0, corte))
  if (!Number.isSafeInteger(expiraEm) || expiraEm * 1000 <= agora) return false

  const recebida = valor.slice(corte + 1)
  const esperada = await assinar(expiraEm, senha)
  // timingSafeEqual explode com tamanhos diferentes, e o tamanho da
  // assinatura e fixo: tamanho errado ja e cookie invalido.
  if (recebida.length !== esperada.length) return false
  return crypto.subtle.timingSafeEqual(bytes(recebida), bytes(esperada))
}
