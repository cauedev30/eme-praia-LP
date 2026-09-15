import type { FC } from 'hono/jsx'
import type { Categoria, Produto } from '../../loja/lib/tipos'

// A tela do painel. Uma pagina, celular primeiro, sem framework no
// navegador: o HTML sai pronto daqui e public/painel.js faz os toques.
// So o que a Mayara precisa: tamanhos adulto (toque alterna) e a chave kids.

const CSS = `
  :root { --laranja: #FB7F20; --terra: #B35207; --grafite: #323233; --breu: #1F1F20; --gelo: #FAFAFA; --concha: #E7E6E2; --apagado: #5A5A5C; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--gelo); color: var(--grafite); font: 16px/1.4 system-ui, sans-serif; }
  header { padding: 20px 16px 8px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; font-size: 13px; color: var(--terra); }
  main { padding: 0 16px 80px; max-width: 640px; margin: 0 auto; }

  /* Grudado no topo ao rolar: numa lista de 17 produtos no celular, e o que
     responde "ainda estou nos biquinis ou ja passei pros maios?". Fundo
     opaco porque o conteudo passa por baixo. */
  h2 { position: sticky; top: 0; z-index: 1; background: var(--gelo);
       margin: 26px 0 10px; padding: 8px 0 7px; font-size: 15px; font-weight: 700;
       text-transform: uppercase; letter-spacing: .1em; color: var(--terra);
       border-bottom: 2px solid var(--terra); }

  article { background: #fff; border: 1px solid var(--concha); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
  .topo { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  h3 { margin: 0; font-size: 16px; font-weight: 500; }

  /* 4:5, a mesma proporcao da vitrine. Pequena de proposito: e pra
     reconhecer a peca de relance, nao pra apreciar a foto. */
  .foto { flex: none; width: 56px; height: 70px; border-radius: 8px; overflow: hidden;
          background: var(--concha); }
  .foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .foto.vazia { display: grid; place-items: center; color: var(--apagado); font-size: 20px; }

  .tamanhos { display: flex; flex-wrap: wrap; gap: 8px; }
  .tamanho { min-width: 52px; min-height: 44px; padding: 0 12px; border-radius: 10px; font: inherit; font-weight: 600; cursor: pointer; border: 2px solid var(--grafite); }
  .tamanho[aria-pressed="true"] { background: var(--grafite); color: var(--gelo); }

  /* Esgotado e preenchido de cinza, nao contorno vazio. Contorno branco com
     um risco fino lia como "botao normal" no celular (o Caue notou usando).
     Cheio vs cheio-cinza separa os dois estados de relance, o risco grosso
     confirma, e o cinza escolhido da 5,5:1 sobre a concha — acima de AA,
     porque a decisao 12 ja mostrou onde texto apagado some. */
  .tamanho[aria-pressed="false"] { background: var(--concha); color: var(--apagado); border-color: var(--concha);
                                   text-decoration: line-through; text-decoration-thickness: 2px; }
  .tamanho:disabled { cursor: wait; }

  .kids { display: flex; align-items: center; gap: 10px; min-height: 44px; margin-top: 8px; font-size: 15px; }
  .kids input { width: 24px; height: 24px; accent-color: var(--laranja); }
  #aviso { position: fixed; left: 16px; right: 16px; bottom: 16px; background: var(--breu); color: var(--gelo); padding: 14px 16px; border-radius: 10px; text-align: center; }
`

type Props = { categorias: Categoria[]; produtos: Produto[]; urlLoja: string }

/** As fotos sao servidas pelo Worker da loja, que e outra origem: o caminho
 *  gravado no banco (`/produtos/x.webp`) precisa do endereco da loja na
 *  frente. Sem URL_LOJA configurada, mostra o slot em vez de um <img>
 *  quebrado. */
function enderecoDaFoto(produto: Produto, urlLoja: string): string | undefined {
  const primeira = produto.imagens[0]
  if (!primeira) return undefined
  if (primeira.startsWith('http://') || primeira.startsWith('https://')) return primeira
  if (!urlLoja) return undefined
  return `${urlLoja.replace(/\/$/, '')}${primeira.startsWith('/') ? '' : '/'}${primeira}`
}

const Linha: FC<{ produto: Produto; urlLoja: string }> = ({ produto, urlLoja }) => {
  const foto = enderecoDaFoto(produto, urlLoja)

  return (
    <article data-produto={produto.id}>
      <div class="topo">
        {foto ? (
          <div class="foto">
            <img src={foto} alt="" width="56" height="70" loading="lazy" decoding="async" />
          </div>
        ) : (
          // aria-hidden porque o nome do produto ao lado ja diz o que e.
          <div class="foto vazia" aria-hidden="true">
            &#9634;
          </div>
        )}
        <h3>{produto.nome}</h3>
      </div>
      {produto.tamanhos.length > 0 && (
        <div class="tamanhos">
          {produto.tamanhos.map((t) => (
            <button
              type="button"
              class="tamanho"
              data-produto={produto.id}
              data-tamanho={t.tamanho}
              aria-pressed={t.disponivel ? 'true' : 'false'}
            >
              {t.tamanho}
            </button>
          ))}
        </div>
      )}
      <label class="kids">
        <input type="checkbox" data-kids={produto.id} checked={produto.temKids} />
        Tem versão kids
      </label>
    </article>
  )
}

export const Tela: FC<Props> = ({ categorias, produtos, urlLoja }) => (
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex, nofollow" />
      <title>Eme Praia — estoque</title>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </head>
    <body>
      <header>
        <h1>Estoque</h1>
        <p>Eme Praia</p>
      </header>
      <main>
        {categorias.map((cat) => {
          const daCategoria = produtos.filter((p) => p.categoria === cat.slug)
          // Categoria sem produto ativo nao vira titulo solto na tela.
          if (daCategoria.length === 0) return null
          return (
            <section>
              <h2>{cat.nome}</h2>
              {daCategoria.map((p) => (
                <Linha produto={p} urlLoja={urlLoja} />
              ))}
            </section>
          )
        })}
      </main>
      {/* role=status faz o leitor de tela anunciar a falha: sem isso, quem
          nao esta olhando o rodape nao fica sabendo que nao salvou. */}
      <div id="aviso" role="status" aria-live="polite" hidden>
        Não salvou. Tenta de novo.
      </div>
      <script src="/painel.js" defer></script>
    </body>
  </html>
)
