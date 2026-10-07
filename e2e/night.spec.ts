import type { Page } from '@playwright/test'
import { test, expect, panel, openConsole, PANELS } from './fixtures'

const night = (page: Page) => panel(page, 'Night Report')

test.describe('Night Report Panel', () => {
  test('TC-25-12: Given the harness serves a /vyom/night fixture When the founder opens the Deck Then the panel shows its time and headings next to the other panels', async ({ page }) => {
    await openConsole(page)
    const at = night(page).locator('.night-report-at')
    await expect(at).toHaveText('2026-10-07 02:14')
    expect(await at.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/mono/i)
    await expect(night(page).locator('.night-line')).toHaveText(
      ['# Night', '## Slices', 'slice 24 done', 'slice 25 waiting for your look'])
    await expect(panel(page, 'Build Loop')).toBeVisible()
    await expect(page.locator('#sec-panels > .panel .night-report')).toHaveCount(1)
  })

  test('TC-25-13: Given the harness runs with the new fixture When the Deck loads Then no "no fixture" refusal occurs for /vyom/night', async ({ page, deck }) => {
    await openConsole(page)
    await expect(night(page).locator('.night-report-at')).toBeVisible()
    expect(deck.served.map((s) => s.path)).toContain('/vyom/night')
    expect(deck.unmocked).toEqual([])
  })

  test('TC-25-14: Given the harness answers /vyom/night with 403 When the Deck loads Then the Night panel says "not permitted for your role" while the others still load', async ({ page, deck }) => {
    deck.use('night', { status: 403, body: {} })
    await openConsole(page)
    await expect(night(page).getByText('NOT BUILT', { exact: true })).toBeVisible()
    await expect(night(page).getByText('not permitted for your role', { exact: true })).toBeVisible()
    await expect(night(page).locator('.night-report-body')).toHaveCount(0)
    for (const title of PANELS.filter((t) => t !== 'Night Report')) {
      await expect(panel(page, title).getByText('NOT BUILT', { exact: true })).toHaveCount(0)
    }
  })
})
