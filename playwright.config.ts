import { defineConfig } from '@playwright/test'

// Runs against the real deck: VYOM_E2E_BASE_URL (default http://localhost:8765),
// logged in via a saved session file in VYOM_E2E_STORAGE (other modes: e2e/deck.ts).
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: process.env.VYOM_E2E_BASE_URL ?? 'http://localhost:8765',
    storageState: process.env.VYOM_E2E_STORAGE || undefined,
  },
})
