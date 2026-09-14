import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// So logica pura em lib/. Componente e testado pelo build + olho.
export default defineConfig({
  // O tsconfig da loja usa `jsx: preserve` (quem transpila e o Next). O oxc
  // do Vitest 4 respeita isso e engasga no .tsx importado pelo teste, entao
  // aqui a transpilacao e ligada so pros testes.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['lib/**/*.test.ts', 'components/**/*.test.ts'],
    exclude: ['node_modules', 'out', '.next'],
  },
})
