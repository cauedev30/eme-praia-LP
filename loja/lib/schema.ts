import { z } from 'zod'
import type { Categoria, Produto, Tamanho } from '@/lib/tipos'

// Validacao do que chega da API antes de virar pagina. Cada schema e
// amarrado ao tipo de tipos.ts com `satisfies`: se o tipo mudar e o schema
// nao acompanhar, o TypeScript recusa aqui, em vez de deixar passar dado
// errado pro build.
//
// So o build (Node) importa este arquivo. Nenhum componente cliente deve
// importar, pra nao mandar o Zod pro navegador.

const centavos = z.number().int().nonnegative()
const slug = z.string().min(1).regex(/^[a-z0-9-]+$/)
const naoVazio = z.string().min(1)

export const TamanhoSchema = z.object({
  tamanho: naoVazio,
  disponivel: z.boolean(),
}) satisfies z.ZodType<Tamanho>

export const ProdutoSchema = z.object({
  id: naoVazio,
  slug,
  nome: naoVazio,
  descricao: z.string(),
  categoria: slug,
  precoCentavos: centavos,
  precoPixCentavos: centavos,
  imagens: z.array(z.string()),
  tamanhos: z.array(TamanhoSchema),
  temKids: z.boolean(),
  ordem: z.number().int(),
  ativo: z.boolean(),
}) satisfies z.ZodType<Produto>

export const CategoriaSchema = z.object({
  id: naoVazio,
  slug,
  nome: naoVazio,
  imagem: z.string(),
  ordem: z.number().int(),
  ativo: z.boolean(),
}) satisfies z.ZodType<Categoria>

// O envelope. Os itens ficam `unknown` de proposito: cada um e validado
// separado em lib/catalogo.ts, pra que um produto invalido seja pulado
// sem derrubar o catalogo inteiro.
export const CatalogoSchema = z.object({
  categorias: z.array(z.unknown()),
  produtos: z.array(z.unknown()),
})
