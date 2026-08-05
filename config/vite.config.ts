/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.VITE_NOTIFICATION_ENABLED === 'true') {
    const required = [
      'VITE_NOTIFICATION_SUPABASE_URL',
      'VITE_NOTIFICATION_SUPABASE_PUBLISHABLE_KEY',
      'VITE_NOTIFICATION_VAPID_PUBLIC_KEY',
    ]
    const missing = required.filter((name) => !env[name]?.trim())
    if (missing.length > 0) {
      throw new Error(`Notification system is enabled but missing: ${missing.join(', ')}`)
    }
  }

  return {
    base: '/NTE-Flowboard/',
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('/react/') ||
                id.includes('/react-dom/') ||
                id.includes('clsx') ||
                id.includes('tailwind-merge')
              ) {
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
      include: ['tests/**/*.test.{ts,tsx}'],
      exclude: ['tests/integration/**/*.real.test.ts'],
      setupFiles: ['tests/setup.ts', 'tests/setupMotion.ts'],
      coverage: {
        provider: 'v8',
        reportsDirectory: '.artifacts/coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
        reporter: ['text', 'html'],
        thresholds: {
          statements: 80,
          branches: 70,
          functions: 75,
          lines: 80,
        },
      },
    },
  }
})
