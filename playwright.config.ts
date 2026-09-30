import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/console/',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:4173/console/',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium'
      },
    },
  ],
})