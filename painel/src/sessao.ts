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
  if (!certa) throw new Error('sessao: senha ausente')

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

const ITERACOES = 100_000
const SAL = bytes('eme-praia-painel-v1')

// Derivar custa 100k iteracoes de proposito: e o que transforma "quebrar a
// senha a partir de um cookie roubado" de minutos em inviavel. Como a chave
// depende so da senha, fica memorizada por isolate e so a primeira
// requisicao paga. Trocar a senha troca a chave e mata os cookies antigos,
// que e a propriedade da decisao 11.
const chavesDerivadas = new Map<string, Promise<CryptoKey>>()

function chaveDe(senha: string): Promise<CryptoKey> {
  // Sem senha nao existe chave. Falhar alto e melhor do que assinar com
  // "undefined" e abrir o painel com uma chave que qualquer um adivinha.
  if (!senha) throw new Error('sessao: senha ausente')

  let chave = chavesDerivadas.get(senha)
  if (!chave) {
    chave = derivar(senha)
    chavesDerivadas.set(senha, chave)
  }
  return chave
}

async function derivar(senha: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', bytes(senha), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SAL, iterations: ITERACOES, hash: 'SHA-256' },
    base,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

async function assinar(expiraEm: number, senha: string): Promise<string> {
  return base64url(await crypto.subtle.sign('HMAC', await chaveDe(senha), bytes(String(expiraEm))))
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
  const a = bytes(recebida)
  const b = bytes(esperada)
  // Comparar em bytes, nao em caracteres: timingSafeEqual explode com
  // tamanhos diferentes, e um caractere nao-ASCII tem mais de um byte.
  if (a.byteLength !== b.byteLength) return false
  return crypto.subtle.timingSafeEqual(a, b)
}
