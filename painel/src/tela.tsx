import type { FC } from 'hono/jsx'
import type { Categoria, Produto } from '../../loja/lib/tipos'

// A tela do painel. Uma pagina, celular primeiro, sem framework no
// navegador: o HTML sai pronto daqui e public/painel.js faz os toques.
// So o que a Mayara precisa: tamanhos adulto (toque alterna) e a chave kids.

const CSS = `
  :root { --laranja: #FB7F20; --terra: #B35207; --grafite: #323233; --breu: #1F1F20; --gelo: #FAFAFA; --concha: #E7E6E2; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--gelo); color: var(--grafite); font: 16px/1.4 system-ui, sans-serif; }
  header { padding: 20px 16px 8px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; font-size: 13px; color: var(--terra); }
  main { padding: 0 16px 80px; max-width: 640px; margin: 0 auto; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--terra); margin: 28px 0 8px; }
  article { background: #fff; border: 1px solid var(--concha); border-radius: 12px; padding: 14px 14px 12px; margin-bottom: 10px; }
  h3 { margin: 0 0 10px; font-size: 16px; font-weight: 500; }
  .tamanhos { display: flex; flex-wrap: wrap; gap: 8px; }
  .tamanho { min-width: 52px; min-height: 44px; padding: 0 12px; border-radius: 10px; font: inherit; font-weight: 600; cursor: pointer; border: 2px solid var(--grafite); }
  .tamanho[aria-pressed="true"] { background: var(--grafite); color: var(--gelo); }
  .tamanho[aria-pressed="false"] { background: transparent; color: var(--grafite); opacity: .45; text-decoration: line-through; }
  .tamanho:disabled { cursor: wait; }
  .kids { display: flex; align-items: center; gap: 10px; min-height: 44px; margin-top: 8px; font-size: 15px; }
  .kids input { width: 24px; height: 24px; accent-color: var(--laranja); }
  #aviso { position: fixed; left: 16px; right: 16px; bottom: 16px; background: var(--breu); color: var(--gelo); padding: 14px 16px; border-radius: 10px; text-align: center; }
`

type Props = { categorias: Categoria[]; produtos: Produto[] }

const Linha: FC<{ produto: Produto }> = ({ produto }) => (
  <article data-produto={produto.id}>
    <h3>{produto.nome}</h3>
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

export const Tela: FC<Props> = ({ categorias, produtos }) => (
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Eme Praia — estoque</title>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </head>
    <body>
      <header>
        <h1>Estoque</h1>
        <p>Eme Praia</p>
      </header>
      <main>
        {categorias.map((cat) => (
          <section>
            <h2>{cat.nome}</h2>
            {produtos
              .filter((p) => p.categoria === cat.slug)
              .map((p) => (
                <Linha produto={p} />
              ))}
          </section>
        ))}
      </main>
      <div id="aviso" hidden>
        Não salvou. Tenta de novo.
      </div>
      <script src="/painel.js" defer></script>
    </body>
  </html>
)
