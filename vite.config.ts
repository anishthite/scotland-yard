import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/scotland-yard/' : '/',
  plugins: [react()],
  server: { host: '0.0.0.0' },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: { reporter: ['text', 'json', 'html'] },
  },
})
