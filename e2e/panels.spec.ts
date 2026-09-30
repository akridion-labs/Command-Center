import { test, expect, panel, openConsole, PANELS, data } from './fixtures'

const CONTENT: Record<(typeof PANELS)[number], string> = {
  Health: 'Low disk space',
  Tasks: 'Daily backup',
  Agents: 'Code Reviewer',
  Quota: '1.2TB',
  Containers: 'web-server',
  'Self-Check': 'all checks green',
}
const ENDPOINT: Record<(typeof PANELS)[number], 'health' | 'tasks' | 'agents' | 'quota' | 'containers' | 'selfcheck'> = {
  Health: 'health', Tasks: 'tasks', Agents: 'agents', Quota: 'quota', Containers: 'containers', 'Self-Check': 'selfcheck',
}
const why = (endpoint: string) => (data(`${endpoint}-not-built.json`) as { why: string }).why

test.describe('Panels', () => {
  test('TC-12b-2: Given no server running When the e2e run starts Then the app is built, served at :4173/console/ and tests begin', async ({ page }) => {
    const res = await page.goto('./')
    expect(res?.status()).toBe(200)
    expect(page.url()).toBe('http://localhost:4173/console/')
    // The BUILT bundle, not the dev server's /src/main.tsx
    const scripts = await page.locator('script[src]').evaluateAll((els) => els.map((e) => e.getAttribute('src') ?? ''))
    expect(scripts.some((s) => s.startsWith('/console/assets/') && s.endsWith('.js'))).toBe(true)
    expect(scripts.some((s) => s.includes('/src/'))).toBe(false)
  })

  test('TC-12b-4: Given the fixtures When the page loads Then every /vyom/* request gets its JSON from e2e/data and none goes out to a network', async ({ page, deck }) => {
    await openConsole(page)
    const vyom = deck.urls.filter((u) => new URL(u).pathname.startsWith('/vyom/'))
    expect(vyom.length).toBeGreaterThan(0)
    expect(deck.served.map((s) => s.path).sort()).toEqual(vyom.map((u) => new URL(u).pathname).sort())
    expect(deck.unmocked).toEqual([])
    for (const u of deck.urls) expect(['localhost', '127.0.0.1']).toContain(new URL(u).hostname)
  })

  test('TC-12b-5: Given a /vyom/* request with no fixture When the page makes it Then the test fails with the path named', async ({ page, deck }) => {
    await openConsole(page)
    await page.evaluate(() => fetch('/vyom/no-such-endpoint').catch(() => null))
    expect(deck.unmocked).toEqual(['/vyom/no-such-endpoint'])
    expect(() => deck.assertAllMocked()).toThrow('/vyom/no-such-endpoint')
    deck.unmocked.length = 0 // proven loud; let teardown pass
  })

  test('TC-12b-6: Given all endpoints BUILT When the console opens Then six panels show their titles and fixture content', async ({ page }) => {
    await openConsole(page)
    for (const title of PANELS) {
      const p = panel(page, title)
      await expect(p).toHaveCount(1)
      await expect(p.getByText(CONTENT[title])).toBeVisible()
      await expect(p.getByText('NOT BUILT')).toHaveCount(0)
    }
    await expect(panel(page, 'Health').getByText('gpt-4')).toBeVisible()
  })

  test('TC-12b-7: Given one endpoint NOT BUILT with a why When the console opens Then that panel shows NOT BUILT and the why verbatim, not an empty list', async ({ page, deck }) => {
    deck.use('agents', 'not-built')
    await openConsole(page)
    const agents = panel(page, 'Agents')
    await expect(agents.getByText('NOT BUILT', { exact: true })).toBeVisible()
    expect(await agents.locator('p').first().textContent()).toBe(why('agents'))
    await expect(agents.locator('li')).toHaveCount(0)
    for (const title of PANELS.filter((t) => t !== 'Agents')) {
      await expect(panel(page, title).getByText(CONTENT[title])).toBeVisible()
    }
  })

  test('TC-12b-8: Given every endpoint NOT BUILT When the console opens Then all six panels show NOT BUILT with their own why and the page does not crash', async ({ page, deck }) => {
    deck.allNotBuilt()
    await openConsole(page)
    for (const title of PANELS) {
      const p = panel(page, title)
      await expect(p.getByText('NOT BUILT', { exact: true })).toBeVisible()
      expect(await p.locator('p').first().textContent()).toBe(why(ENDPOINT[title]))
    }
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('TC-12b-9: Given empty lists on a BUILT endpoint When the console opens Then the panel shows its empty words, not a blank card', async ({ page, deck }) => {
    deck.use('health', { body: { model: 'gpt-4', attention: [] } })
    deck.use('agents', { body: { agents: [] } })
    deck.use('containers', { body: { containers: [] } })
    await openConsole(page)
    await expect(panel(page, 'Health').getByText('no attention items')).toBeVisible()
    await expect(panel(page, 'Agents').getByText('no agents in ~/.claude/agents')).toBeVisible()
    await expect(panel(page, 'Containers').getByText('no containers reported')).toBeVisible()
  })

  test('TC-12b-10: Given one endpoint returns 500 When the console opens Then that panel shows NOT BUILT "unreachable" and the other five still render', async ({ page, deck }) => {
    deck.use('containers', { status: 500, body: { error: 'boom' } })
    await openConsole(page)
    const containers = panel(page, 'Containers')
    await expect(containers.getByText('NOT BUILT', { exact: true })).toBeVisible()
    await expect(containers.getByText('/vyom/containers unreachable', { exact: true })).toBeVisible()
    for (const title of PANELS.filter((t) => t !== 'Containers')) {
      await expect(panel(page, title).getByText(CONTENT[title])).toBeVisible()
    }
  })

  test('TC-12b-11: Given 50+ rows in a panel fixture When the console opens Then all rows render in order and the grid is not broken', async ({ page, deck }) => {
    const names = Array.from({ length: 60 }, (_, i) => `agent-${String(i + 1).padStart(2, '0')}`)
    deck.use('agents', { body: { agents: names.map((name) => ({ name })) } })
    await openConsole(page)
    const rows = panel(page, 'Agents').locator('li')
    await expect(rows).toHaveCount(60)
    expect(await rows.allTextContents()).toEqual(names)
    for (const title of PANELS) {
      const box = await panel(page, title).boundingBox()
      expect(box && box.width > 100 && box.height > 20).toBe(true)
    }
  })

  // TC-23-08: Given the dashboard displays data bindings When user verifies API connections Then all bindings map to actual endpoints or NOT BUILT states
  test('TC-23-08: verifies all data bindings map to actual endpoints or NOT BUILT states', async ({ page, deck }) => {
    // Configure fixtures for all key endpoints that should be bound in the deck
    deck.use('health', { body: { model: 'gpt-4', vault: { total_chunks: 1234 } } })
    deck.use('quota', { body: { storage: { size: '5.2TB', chunks: 4567, index_age: '2d' }, usage: { built: true } } })

    await openConsole(page)

    // Verify key elements are properly bound
    const modelCard = page.getByText('Active model').first().locator('..').locator('.card-value')
    const quotaCard = page.getByText('Cloud quota').first().locator('..').locator('.card-value')
    const chunksCard = page.getByText('Vault chunks').first().locator('..').locator('.card-value')

    // These should show actual values from the fixtures
    await expect(modelCard).toBeVisible()
    await expect(quotaCard).toBeVisible()
    await expect(chunksCard).toBeVisible()

    // Verify they contain expected content
    await expect(modelCard).toContainText('gpt-4')
    await expect(quotaCard).toContainText('5.2TB')
    await expect(chunksCard).toContainText('1234')
  })
})
