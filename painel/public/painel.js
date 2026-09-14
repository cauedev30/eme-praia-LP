// Os toques do painel. Otimista: muda na hora, manda o PATCH, desfaz se a
// API recusar. Enquanto a resposta nao volta, o controle fica travado
// contra toque duplo. Sem botao salvar, sem recarregar.

const aviso = document.getElementById('aviso')
let timerAviso

function avisar() {
  aviso.hidden = false
  clearTimeout(timerAviso)
  timerAviso = setTimeout(() => {
    aviso.hidden = true
  }, 4000)
}

async function patch(url, corpo) {
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  // Sessao vencida (ou senha trocada): manda logar de novo em vez de
  // mostrar "nao salvou" pra sempre.
  if (r.status === 401) {
    location.href = '/entrar'
    throw new Error('401')
  }
  if (!r.ok) throw new Error(String(r.status))
}

function pintar(botao, disponivel) {
  botao.setAttribute('aria-pressed', disponivel ? 'true' : 'false')
}

document.addEventListener('click', async (ev) => {
  const botao = ev.target.closest('button.tamanho')
  if (!botao || botao.disabled) return
  const estava = botao.getAttribute('aria-pressed') === 'true'
  const { produto, tamanho } = botao.dataset

  pintar(botao, !estava)
  botao.disabled = true
  try {
    await patch(
      `/api/produtos/${encodeURIComponent(produto)}/tamanhos/${encodeURIComponent(tamanho)}`,
      { disponivel: !estava },
    )
  } catch {
    pintar(botao, estava)
    avisar()
  } finally {
    botao.disabled = false
  }
})

document.addEventListener('change', async (ev) => {
  const caixa = ev.target.closest('input[data-kids]')
  if (!caixa) return
  const novo = caixa.checked

  caixa.disabled = true
  try {
    await patch(`/api/produtos/${encodeURIComponent(caixa.dataset.kids)}`, { temKids: novo })
  } catch {
    caixa.checked = !novo
    avisar()
  } finally {
    caixa.disabled = false
  }
})
