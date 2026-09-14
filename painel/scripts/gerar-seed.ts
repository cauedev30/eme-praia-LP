import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { categorias } from '../../loja/data/categorias'
import { produtos } from '../../loja/data/produtos'

// Gera migrations/0002_seed.sql a partir das fixtures da Fase 0. Roda UMA
// vez. Depois disso loja/data/ e este script sao apagados: o banco passa a
// ser a fonte, e o SQL gerado fica versionado como registro do que entrou.

const texto = (v: string) => `'${v.replace(/'/g, "''")}'`
const bit = (v: boolean) => (v ? 1 : 0)

const idDaCategoria = new Map(categorias.map((c) => [c.slug, c.id]))

const linhas: string[] = [
  `-- Seed gerado de loja/data/*.ts em ${new Date().toISOString().slice(0, 10)}.`,
  '-- Sao os 17 fixtures herdados da Fase 0; o catalogo real entra pelo painel.',
  '',
]

for (const c of categorias) {
  linhas.push(
    `INSERT INTO categorias (id, slug, nome, imagem, ordem, ativo) VALUES (` +
      `${texto(c.id)}, ${texto(c.slug)}, ${texto(c.nome)}, ${texto(c.imagem)}, ${c.ordem}, ${bit(c.ativo)});`,
  )
}

linhas.push('')

for (const p of produtos) {
  const categoriaId = idDaCategoria.get(p.categoria)
  if (!categoriaId) throw new Error(`Produto ${p.slug} aponta pra categoria inexistente: ${p.categoria}`)
  linhas.push(
    `INSERT INTO produtos (id, slug, nome, descricao, categoria_id, preco_centavos, preco_pix_centavos, imagens, tem_kids, ordem, ativo) VALUES (` +
      `${texto(p.id)}, ${texto(p.slug)}, ${texto(p.nome)}, ${texto(p.descricao)}, ${texto(categoriaId)}, ` +
      `${p.precoCentavos}, ${p.precoPixCentavos}, ${texto(JSON.stringify(p.imagens))}, ${bit(p.temKids)}, ${p.ordem}, ${bit(p.ativo)});`,
  )
  p.tamanhos.forEach((t, i) => {
    linhas.push(
      `INSERT INTO tamanhos (produto_id, tamanho, ordem, disponivel) VALUES (` +
        `${texto(p.id)}, ${texto(t.tamanho)}, ${i + 1}, ${bit(t.disponivel)});`,
    )
  })
}

const destino = join(import.meta.dirname, '..', 'migrations', '0002_seed.sql')
writeFileSync(destino, linhas.join('\n') + '\n')
console.log(`ok: ${categorias.length} categorias, ${produtos.length} produtos -> ${destino}`)
