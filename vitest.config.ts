import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // e2e/ is Playwright's (npm run e2e), not vitest's
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})