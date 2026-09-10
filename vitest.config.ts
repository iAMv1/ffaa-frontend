import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Standalone on purpose: the app's vite.config uses the rolldown vite 8
// toolchain; vitest ships its own compatible vite. Keeping this config
// dependency-free means the test runner never couples to the build toolchain.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
