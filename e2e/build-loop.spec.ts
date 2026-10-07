import type { Page } from '@playwright/test'
import { test, expect, panel, openConsole, data } from './fixtures'

const build = (page: Page) => panel(page, 'Build Loop')
const why = (data('build-not-built.json') as { why: string }).why

/** Hold /vyom/build until release() so the loading state can be seen; answers with the built fixture. */
async function holdBuild(page: Page) {
  let release!: () => void
  const gate = new Promise<void>((r) => { release = r })
  // registered after the deck's handler, so it runs first for this path
  await page.route('**/vyom/build', async (route) => {
    await gate
    await route.fallback()
  })
  return release
}

/** Replace the clipboard before the app loads: 'ok' records the text, 'fail' rejects. */
async function clipboard(page: Page, mode: 'ok' | 'fail') {
  await page.addInitScript((m) => {
    const w = window as unknown as { copied: string[] }
    w.copied = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (t: string) => (m === 'ok' ? (w.copied.push(t), Promise.resolve()) : Promise.reject(new Error('denied'))) },
    })
  }, mode)
}

test.describe('Build Loop Panel', () => {
  test('TC-24-01: Given user is on dashboard When panel loads Then slices are grouped by state', async ({ page }) => {
    await openConsole(page)
    await expect(build(page).locator('.slice-group > h3')).toHaveText(
      ['done', 'waiting for your look', 'parked', 'needs you', 'reopened', 'yours', 'to do'])
    await expect(build(page).locator('[data-state="look"] .slice-title')).toHaveText(['Gaps panel'])
  })

  test('TC-24-02: Given user is viewing panel When slice has status Then status line is displayed', async ({ page }) => {
    await openConsole(page)
    await expect(build(page).locator('.slice-status')).toHaveText([
      'proof passed, ticked', 'built, waiting for your look', 'parked: waits on /vyom/night',
      'proof failed twice, needs you', 'reopened after review', 'yours to build by hand', 'not started',
    ])
  })

  test('TC-24-03: Given user is viewing panel When slice has next command Then command is shown in monospace with Copy button', async ({ page }) => {
    await clipboard(page, 'ok')
    await openConsole(page)
    const cmds = build(page).locator('.slice-next code')
    await expect(cmds).toHaveText(['ojas build --look 23', 'ojas build --why 24', 'ojas build --slice 27'])
    expect(await cmds.first().evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/mono/i)
    await expect(build(page).getByRole('button', { name: 'Copy' })).toHaveCount(3)
    await build(page).locator('[data-state="todo"]').getByRole('button', { name: 'Copy' }).click()
    await expect(build(page).locator('[data-state="todo"] .slice-next')).toContainText('copied')
    expect(await page.evaluate(() => (window as unknown as { copied: string[] }).copied)).toEqual(['ojas build --slice 27'])
  })

  test('TC-24-03: Given the clipboard refuses When Copy is clicked Then the panel says the copy failed', async ({ page }) => {
    await clipboard(page, 'fail')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await openConsole(page)
    await build(page).locator('[data-state="look"]').getByRole('button', { name: 'Copy' }).click()
    await expect(build(page).getByRole('alert')).toContainText('copy failed')
    expect(errors).toEqual([])
  })

  test('TC-24-04: Given user is viewing panel When slices have finished_by Then user names are displayed', async ({ page }) => {
    await openConsole(page)
    await expect(build(page).locator('.finished-by li')).toHaveText(['claude-opus-5-5 - 3', 'qwen2.5-coder:7b - 1'])
  })

  test('TC-24-05: Given user is on dashboard When API is loading Then loading state is shown', async ({ page }) => {
    const release = await holdBuild(page)
    await page.goto('./')
    await expect(build(page).getByText('loading…')).toBeVisible()
    await expect(build(page).locator('.slice-group')).toHaveCount(0)
    release()
    await expect(build(page).getByText('Build frontend assets')).toBeVisible()
    await expect(build(page).getByText('loading…')).toHaveCount(0)
  })

  test('TC-24-06: Given user is viewing panel When no slices exist Then empty state is shown', async ({ page, deck }) => {
    deck.use('build', { body: { built: true, slices: [], count: {}, finished_by: {} } })
    await openConsole(page)
    await expect(build(page).getByText('No build slices found')).toBeVisible()
    await expect(build(page).locator('li')).toHaveCount(0)
  })

  test('TC-24-07: Given user is viewing panel When API fails Then error message is displayed', async ({ page, deck }) => {
    deck.use('build', { status: 500, body: { error: 'boom' } })
    await openConsole(page)
    await expect(build(page).getByText('NOT BUILT', { exact: true })).toBeVisible()
    await expect(build(page).getByText('/vyom/build unreachable', { exact: true })).toBeVisible()
    await expect(panel(page, 'Doctor').getByText('ollama reachable')).toBeVisible()
  })

  test('TC-24-08: Given user is viewing panel When endpoint not built Then NOT BUILT state with reason is shown', async ({ page, deck }) => {
    deck.use('build', 'not-built')
    await openConsole(page)
    await expect(build(page).getByText('NOT BUILT', { exact: true })).toBeVisible()
    expect(await build(page).locator('p').first().textContent()).toBe(why)
    await expect(build(page).locator('li')).toHaveCount(0)
  })

  test('TC-24-09: Given user lacks permission When accessing panel Then permission denied message is shown', async ({ page, deck }) => {
    deck.use('build', { status: 403, body: {} })
    await openConsole(page)
    await expect(build(page).getByText('NOT BUILT', { exact: true })).toBeVisible()
    await expect(build(page).getByText('not permitted for your role', { exact: true })).toBeVisible()
  })

  test('TC-24-10: Given build data exists When panel renders Then slices are grouped correctly', async ({ page }) => {
    await openConsole(page)
    const titles = (state: string) => build(page).locator(`[data-state="${state}"] .slice-title`)
    await expect(titles('done')).toHaveText(['Build frontend assets'])
    await expect(titles('parked')).toHaveText(['Night report panel'])
    await expect(titles('needs_you')).toHaveText(['Build loop panel'])
    await expect(titles('reopened')).toHaveText(['Models fit column'])
    await expect(titles('yours')).toHaveText(['Deck layout pass'])
    await expect(titles('todo')).toHaveText(['Ask history'])
  })

  test('TC-24-11: Given slice has next command When component renders Then Copy button is displayed', async ({ page }) => {
    await openConsole(page)
    for (const state of ['look', 'needs_you', 'todo']) {
      await expect(build(page).locator(`[data-state="${state}"]`).getByRole('button', { name: 'Copy' })).toHaveCount(1)
    }
    for (const state of ['done', 'parked', 'reopened', 'yours']) {
      await expect(build(page).locator(`[data-state="${state}"]`).getByRole('button')).toHaveCount(0)
    }
  })

  test('TC-24-12: Given finished_by data exists When panel renders Then user names are shown', async ({ page }) => {
    await openConsole(page)
    await expect(build(page).locator('.finished-by .mono')).toHaveText(['claude-opus-5-5', 'qwen2.5-coder:7b'])
  })

  test('TC-24-12: Given finished_by is empty When panel renders Then it says no slice is finished yet', async ({ page, deck }) => {
    deck.use('build', { body: { ...(data('build.json') as object), finished_by: {} } })
    await openConsole(page)
    await expect(build(page).locator('.finished-by')).toContainText('no slice finished yet')
  })

  test('TC-24-13: Given loading state When panel loads Then loading spinner is visible', async ({ page }) => {
    const release = await holdBuild(page)
    await page.goto('./')
    await expect(build(page).locator('.card-note', { hasText: 'loading…' })).toBeVisible()
    release()
  })

  test('TC-24-14: Given empty state When no slices exist Then appropriate message is displayed', async ({ page, deck }) => {
    deck.use('build', { body: { built: true, slices: [], count: {}, finished_by: {} } })
    await openConsole(page)
    await expect(build(page).locator('.card-note', { hasText: 'No build slices found' })).toBeVisible()
  })

  test('TC-24-15: Given error state When API fails Then error message is styled appropriately', async ({ page, deck }) => {
    deck.use('build', { status: 500, body: {} })
    await openConsole(page)
    await expect(build(page).locator('.not-built h3')).toHaveText('NOT BUILT')
    await expect(build(page).locator('.not-built p')).toHaveText('/vyom/build unreachable')
  })
})
