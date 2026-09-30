import { expect, test, type Page } from '@playwright/test'
import { ask, openConsole, STUB_QUESTION } from './deck'

const sceneChunk = /\/assets\/Scene-[^/]+\.js(?:\?.*)?$/

async function panelsWork(page: Page) {
  for (const title of ['Health', 'Tasks', 'Agents', 'Quota', 'Containers', 'Actions', 'Self-Check']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: '7d', exact: true }).click()
  expect(await page.getByRole('button', { name: '7d', exact: true }).getAttribute('aria-pressed')).toBe('true')
  const input = page.getByPlaceholder('Ask a question...')
  await input.fill('scene does not block typing')
  await expect(input).toHaveValue('scene does not block typing')
}

async function sceneVisible(page: Page) {
  await expect(page.locator('canvas')).toBeVisible()
  await expect.poll(() => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2')
    return Boolean(gl && !gl.isContextLost())
  })).toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

test('TC-10-5: five seconds of the running scene requests only the deck origin', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  const external: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).origin !== origin) external.push(request.url())
  })
  await openConsole(page, origin)
  await sceneVisible(page)
  await page.waitForTimeout(5000)
  expect(external).toEqual([])
})

test('TC-10-7: panels work during a five-second scene download without layout shift', async ({ page, baseURL }) => {
  let arrived = false
  let released = false
  await page.route(sceneChunk, async route => {
    arrived = true
    await new Promise(resolve => setTimeout(resolve, 5000))
    released = true
    await route.fallback()
  })
  await openConsole(page, new URL(baseURL!).origin, 'domcontentloaded')
  await expect.poll(() => arrived).toBe(true)
  await panelsWork(page)
  expect(released).toBe(false)
  await expect(page.locator('canvas')).toHaveCount(0)
  const positions = () => page.locator('#sec-panels .panel').evaluateAll(panels => panels.map(panel => {
    const rect = panel.getBoundingClientRect()
    return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height }
  }))
  const before = await positions()
  // The chunk is held 5 s from its request; only after that can the canvas start to mount.
  await expect.poll(() => released, { timeout: 10_000 }).toBe(true)
  await sceneVisible(page)
  expect(await positions()).toEqual(before)
})

test('TC-10-9: unavailable WebGL leaves all tiles usable with no canvas or console errors', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = new Proxy(original, {
      apply(target, canvas, args) {
        if (String(args[0]).startsWith('webgl')) return null
        return Reflect.apply(target, canvas, args)
      },
    })
  })
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  await openConsole(page, new URL(baseURL!).origin)
  await panelsWork(page)
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('TC-10-11: reduced motion requests no scene chunk and leaves the plain deck usable', async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const chunks: string[] = []
  page.on('request', request => { if (sceneChunk.test(request.url())) chunks.push(request.url()) })
  await openConsole(page, new URL(baseURL!).origin)
  await panelsWork(page)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(chunks).toEqual([])
})

test('TC-10-14: losing the real WebGL context removes decoration while panels keep working', async ({ page, baseURL }) => {
  await openConsole(page, new URL(baseURL!).origin)
  await sceneVisible(page)
  const panels = await page.locator('#sec-panels').elementHandle()
  const lost = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')
    if (!extension) return false
    extension.loseContext()
    return true
  })
  expect(lost, 'browser must expose context-loss extension to exercise the failure').toBe(true)
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(await panels!.evaluate(element => element.isConnected)).toBe(true)
  await panelsWork(page)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('TC-10-15: tiles, source links and Ask remain interactive above the running scene', async ({ page, context, baseURL }) => {
  await openConsole(page, new URL(baseURL!).origin)
  await sceneVisible(page)
  await panelsWork(page)
  const card = await ask(page, process.env.VYOM_E2E_QUESTION ?? STUB_QUESTION)
  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    card.getByTestId('ask-sources').locator('a').first().click(),
  ])
  await tab.waitForLoadState()
  expect(tab.url()).not.toBe('about:blank')
  await expect(page.getByLabel('Ask Vyom')).toBeVisible()
})

test('TC-10-17: keyboard navigation never focuses the decorative canvas', async ({ page, baseURL }) => {
  await openConsole(page, new URL(baseURL!).origin)
  await sceneVisible(page)
  const steps = await page.locator('a, button, input, textarea, [tabindex]').count()
  for (let i = 0; i < steps + 2; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('CANVAS')
  }
  expect(await page.locator('canvas').evaluate(canvas => canvas.tabIndex)).toBe(-1)
  await expect(page.locator('[aria-hidden="true"]').filter({ has: page.locator('canvas') })).toHaveCount(1)
})
