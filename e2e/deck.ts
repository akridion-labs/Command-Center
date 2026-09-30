import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

// Three ways to reach a logged-in console:
//   live    VYOM_E2E_STORAGE is a saved session (playwright.config.ts loads it)
//   login   VYOM_E2E_USER + VYOM_E2E_PASSWORD sign in through the real /vyom/login form
//   stubbed neither is set: the freshly built bundle (global-setup.ts) is served under the
//           running deck's OWN CSP header, and /vyom/* answers from the fixtures below.
// Stubbed proves the UI + CSP of the built console; only live/login proves a REAL answer (TC-6-26).
export const DIST = join(process.cwd(), 'node_modules/.cache/e2e-console')

const USER = process.env.VYOM_E2E_USER
const PASSWORD = process.env.VYOM_E2E_PASSWORD
export const MODE: 'live' | 'login' | 'stubbed' =
  process.env.VYOM_E2E_STORAGE ? 'live' : USER && PASSWORD ? 'login' : 'stubbed'

export const STUB_QUESTION = 'what is due?'
export const STUB_EMPTY_QUESTION = 'what is on the far side of the moon?'

const STUB_SOURCES = [
  { title: 'Due jobs', url: '/vyom/docs/due-jobs', snippet: 'Two jobs are due this week.' },
  { title: 'Runbook', url: '/vyom/docs/runbook', snippet: 'How the nightly jobs are scheduled.' },
]

const TYPES: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json',
}

async function stubDeck(context: BrowserContext, origin: string) {
  // The real server's policy, read live - a copied string would drift from what production sends.
  const probe = await context.request.get(`${origin}/vyom/login`, { maxRedirects: 0 })
  const csp = probe.headers()['content-security-policy']
  expect(csp, 'running deck must send a Content-Security-Policy header').toBeTruthy()
  const headers = { 'content-security-policy': csp! }

  await context.route(`${origin}/**`, async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname

    if (path === '/vyom/ask' && req.method() === 'POST') {
      const { query } = req.postDataJSON() as { query: string }
      const empty = query === STUB_EMPTY_QUESTION
      return route.fulfill({
        headers, contentType: 'application/json',
        body: JSON.stringify({ answer: empty ? 'I found nothing on that.' : 'Two jobs are due.', sources: empty ? [] : STUB_SOURCES }),
      })
    }
    if (path.startsWith('/vyom/docs/')) {
      return route.fulfill({ headers, contentType: 'text/plain', body: `document ${path}` })
    }
    if (path.startsWith('/vyom/')) {
      return route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify({ built: false, why: 'stubbed deck' }) })
    }
    if (path.startsWith('/console/')) {
      const rel = normalize(path.slice('/console/'.length) || 'index.html')
      if (rel.startsWith('..')) return route.fulfill({ status: 404, headers })
      try {
        const body = await readFile(join(DIST, rel))
        return route.fulfill({ headers, contentType: TYPES[extname(rel)] ?? 'application/octet-stream', body })
      } catch {
        return route.fulfill({ status: 404, headers })
      }
    }
    return route.fulfill({ status: 404, headers })
  })
}

export async function openConsole(page: Page, origin: string) {
  test.info().annotations.push({ type: 'deck', description: MODE })
  if (MODE === 'stubbed') await stubDeck(page.context(), origin)
  if (MODE === 'login') {
    await page.goto('/vyom/login')
    await page.getByLabel('User').fill(USER!)
    await page.getByLabel('Password').fill(PASSWORD!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForLoadState('networkidle')
  }
  await page.goto('/console/')
  await expect(page, 'no logged-in session: set VYOM_E2E_STORAGE or VYOM_E2E_USER/VYOM_E2E_PASSWORD').not.toHaveURL(/\/vyom\/login/)
}
