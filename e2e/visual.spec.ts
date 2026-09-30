import { test, expect, openConsole } from './fixtures'
import type { Page } from '@playwright/test'

// Screenshots are compared with the approved baselines; a test never rewrites one.
const shot = { animations: 'disabled', fullPage: true } as const
const mask = (page: Page) => [page.locator('canvas')]

test.describe('Visual Tests', { tag: '@visual' }, () => {
  test.describe('1280x800 viewport', () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test('TC-12b-21: Given the settled console at 1280x800 with animations off and the canvas masked When screenshotted Then it matches the approved baseline', async ({ page }) => {
      await openConsole(page)
      await expect(page).toHaveScreenshot('1280x800.png', { ...shot, mask: mask(page) })
    })

    test('TC-12b-23: Given a NOT BUILT fixture set at 1280x800 When screenshotted Then the NOT BUILT look is its own baseline', async ({ page, deck }) => {
      deck.allNotBuilt()
      await openConsole(page)
      await expect(page).toHaveScreenshot('not-built-1280x800.png', { ...shot, mask: mask(page) })
    })

    test('TC-12b-24: Given an unchanged app When `@visual` runs twice Then the second run shows no difference', async ({ page }) => {
      await openConsole(page)
      const first = await page.screenshot({ ...shot, mask: mask(page) })
      const second = await page.screenshot({ ...shot, mask: mask(page) })
      expect(first.equals(second)).toBe(true)
    })
  })

  test.describe('1920x1080 viewport', () => {
    test.use({ viewport: { width: 1920, height: 1080 } })

    test('TC-12b-22: Given the settled console at 1920x1080 with animations off and the canvas masked When screenshotted Then it matches the approved baseline', async ({ page }) => {
      await openConsole(page)
      await expect(page).toHaveScreenshot('1920x1080.png', { ...shot, mask: mask(page) })
    })
  })
})
