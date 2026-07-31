import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  outputDir: './test-artifacts/playwright/results',
  reporter: [
    ['list'],
    ['html', { outputFolder: './test-artifacts/playwright/report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173/NTE-Flowboard/',
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/NTE-Flowboard/',
    reuseExistingServer: !process.env.CI,
  },
})
