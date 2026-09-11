import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// So logica pura em lib/. Componente e testado pelo build + olho.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['lib/**/*.test.ts'],
    exclude: ['node_modules', 'out', '.next'],
  },
})
