/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/NTE-Flowboard/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor'
            }
            if (id.includes('supabase')) {
              return 'sync'
            }
            if (id.includes('motion')) {
              return 'motion'
            }
            if (id.includes('@dnd-kit')) {
              return 'dndkit'
            }
            if (id.includes('lucide')) {
              return 'icons'
            }
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/tests/**/*.test.{ts,tsx}'],
    setupFiles: ['src/tests/setup.ts', 'src/tests/setupMotion.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text', 'html'],
    },
  },
})
