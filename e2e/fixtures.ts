import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test as base, expect, type Page } from '@playwright/test'

// Every /vyom/* request is answered here from e2e/data/<name>.json (BUILT) or <name>-not-built.json.
// Nothing reaches a live deck or the internet: unknown /vyom paths are aborted and fail the test,
// and any non-local request is aborted and recorded for the intranet check.
export const ENDPOINTS = ['health', 'tasks', 'agents', 'quota', 'containers', 'selfcheck', 'me', 'ask', 'doctor', 'models'] as const
export type Endpoint = (typeof ENDPOINTS)[number]

export type Reply =
  | 'built'
  | 'not-built'
  | { status?: number; body?: unknown; abort?: true }

const DATA = join(process.cwd(), 'e2e/data')
export const data = (file: string): unknown => JSON.parse(readFileSync(join(DATA, file), 'utf8'))

export const LOCAL_HOSTS = ['localhost', '127.0.0.1']

/** Every URL whose host is not localhost/127.0.0.1. */
export function offIntranet(urls: string[]): string[] {
  return urls.filter((u) => {
    if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return false
    return !LOCAL_HOSTS.includes(new URL(u).hostname)
  })
}

/** The intranet rule: throws naming every offending URL. */
export function assertIntranet(urls: string[]) {
  const bad = offIntranet(urls)
  if (bad.length) throw new Error(`requests left localhost: ${bad.join(', ')}`)
}

export interface Deck {
  /** Choose how an endpoint answers; call before page.goto. */
  use(name: Endpoint, reply: Reply): void
  /** Every endpoint NOT BUILT. */
  allNotBuilt(): void
  /** /vyom paths the page asked for that no fixture answers. */
  unmocked: string[]
  /** /vyom requests answered, in order. */
  served: { method: string; path: string; postData: string | null }[]
  /** Every URL the page requested (for the intranet rule). */
  urls: string[]
  assertAllMocked(): void
}

export const test = base.extend<{ deck: Deck }>({
  // auto: installed for every test, so no page ever loads unmocked
  deck: [async ({ page }, use) => {
    const replies = new Map<Endpoint, Reply>(ENDPOINTS.map((e) => [e, 'built']))
    const deck: Deck = {
      use: (name, reply) => { replies.set(name, reply) },
      allNotBuilt: () => { for (const e of ENDPOINTS) replies.set(e, 'not-built') },
      unmocked: [],
      served: [],
      urls: [],
      assertAllMocked() {
        if (deck.unmocked.length) throw new Error(`/vyom request with no fixture: ${deck.unmocked.join(', ')}`)
      },
    }

    page.on('request', (req) => { deck.urls.push(req.url()) })

    // Registered first so it runs last: anything the /vyom handler did not take.
    await page.route('**/*', (route) => {
      const url = route.request().url()
      if (offIntranet([url]).length) return route.abort('blockedbyclient')
      return route.fallback()
    })

    await page.route('**/vyom/**', (route) => {
      const req = route.request()
      const path = new URL(req.url()).pathname
      const name = path.slice('/vyom/'.length) as Endpoint
      const reply = replies.get(name)
      if (!ENDPOINTS.includes(name) || reply === undefined) {
        deck.unmocked.push(path)
        return route.abort('failed')
      }
      deck.served.push({ method: req.method(), path, postData: req.postData() })
      if (typeof reply === 'string') {
        return route.fulfill({ json: data(reply === 'built' ? `${name}.json` : `${name}-not-built.json`) })
      }
      if (reply.abort) return route.abort('connectionrefused')
      return route.fulfill({ status: reply.status ?? 200, json: reply.body ?? {} })
    })

    await use(deck)
    deck.assertAllMocked()
  }, { auto: true }],
})

export { expect }

export const PANELS = ['Health', 'Tasks', 'Agents', 'Quota', 'Containers', 'Self-Check', 'Models', 'Doctor'] as const

/** The panel card whose heading is exactly `title`. */
export function panel(page: Page, title: string) {
  return page.locator('.panel').filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) })
}

/** Open the console and wait until no panel is still loading. */
export async function openConsole(page: Page) {
  await page.goto('./')
  for (const title of PANELS) await expect(panel(page, title)).toBeVisible()
  await expect(page.locator('.panel').getByText('loading…')).toHaveCount(0)
}
