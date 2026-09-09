import type { Categoria } from '@/lib/tipos'

// PLACEHOLDER da Fase 0. Na Fase 1 isso sai daqui e passa a vir do D1, onde a
// Mayara cria e renomeia categoria sozinha pelo painel.

export const categorias: Categoria[] = [
  {
    id: 'biquinis',
    slug: 'biquinis',
    nome: 'Biquínis',
    imagem: '',
    ordem: 1,
    ativo: true,
  },
  {
    id: 'maio',
    slug: 'maio',
    nome: 'Maiô',
    imagem: '',
    ordem: 2,
    ativo: true,
  },
  {
    id: 'linha-kids',
    slug: 'linha-kids',
    nome: 'Linha Kids',
    // TODO(Cauê): trocar pela foto real da linha kids da Eme Praia.
    imagem: '',
    ordem: 3,
    ativo: true,
  },
]
