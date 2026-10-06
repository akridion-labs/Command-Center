import { test, expect, panel, openConsole, data, type Deck } from './fixtures'

const why = (file: string) => (data(file) as { why: string }).why
const posted = (deck: Deck) => deck.served.filter((s) => s.path === '/vyom/ask').map((s) => JSON.parse(s.postData ?? '{}'))

test.describe('Model console', () => {
  test('TC-21-01: Given the console is loaded When selfcheck answers Then each row shows its level, area, text and fix', async ({ page }) => {
    await openConsole(page)
    const rows = panel(page, 'Self-Check').locator('li[data-level]')
    await expect(rows).toHaveCount(2)
    expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-level')))).toEqual(['ok', 'warn'])
    expect(await rows.nth(0).textContent()).toBe('ok brain all checks green')
    expect(await rows.nth(1).locator('code').textContent()).toBe('ojas index --refresh')
    await expect(rows.nth(1).getByText('index is 3 days old')).toBeVisible()
  })

  test('TC-21-02: Given the console is loaded When doctor answers Then each check shows; a failing one has its cause and a copyable do command; fixed shows "fixed automatically"', async ({ page }) => {
    await openConsole(page)
    const doctor = panel(page, 'Doctor')
    const checks = doctor.locator('li')
    await expect(checks).toHaveCount(3)
    expect(await checks.evaluateAll((els) => els.map((e) => e.getAttribute('data-ok')))).toEqual(['true', 'true', 'false'])
    await expect(checks.nth(1).getByText('fixed automatically')).toBeVisible()
    await expect(checks.nth(2).getByText('GPU memory near capacity')).toBeVisible()
    const cmd = checks.nth(2).locator('code.mono')
    expect(await cmd.textContent()).toBe('ojas doctor --fix')
    expect(await cmd.evaluate((e) => getComputedStyle(e).userSelect)).toBe('all')
    await expect(checks.nth(2).getByRole('button', { name: 'Copy' })).toBeVisible()
  })

  test('TC-21-03: Given the console is loaded When models answers Then local models are listed with the default marked and calls, minutes, slices ok and first-try %', async ({ page }) => {
    await openConsole(page)
    const models = panel(page, 'Models')
    const row = (name: string) => models.locator(`tr[data-model="${name}"] td`)
    expect(await row('qwen2.5-coder:14b').allTextContents()).toEqual(['qwen2.5-coder:14b default', '120', '95', '12', '75%'])
    expect(await row('llama3.1:8b').allTextContents()).toEqual(['llama3.1:8b', '40', '31', '4', '25%'])
    await expect(models.getByText('Default model:')).toBeVisible()
  })

  test('TC-21-05: Given two installed models When one question is asked with each Then each POST carries its model and the answer shows', async ({ page, deck }) => {
    await openConsole(page)
    const box = page.getByLabel('Ask Vyom')
    const picker = box.getByRole('combobox', { name: 'Model' })
    expect(await picker.locator('option').allTextContents()).toEqual([
      'brain default (qwen2.5-coder:14b)', 'qwen2.5-coder:14b (default)', 'llama3.1:8b',
    ])
    const question = 'why did slice 20 stall?'
    for (const model of ['qwen2.5-coder:14b', 'llama3.1:8b']) {
      await picker.selectOption(model)
      await box.getByPlaceholder('Ask a question...').fill(question)
      await box.getByRole('button', { name: 'Ask' }).click()
      await expect(box.getByTestId('ask-answer')).toBeVisible()
    }
    expect(posted(deck)).toEqual([{ query: question, model: 'qwen2.5-coder:14b' }, { query: question, model: 'llama3.1:8b' }])
  })

  test('TC-21-09: Given selfcheck, doctor and models NOT BUILT When the console opens Then each shows NOT BUILT with its own why', async ({ page, deck }) => {
    for (const e of ['selfcheck', 'doctor', 'models'] as const) deck.use(e, 'not-built')
    await openConsole(page)
    for (const [title, file] of [['Self-Check', 'selfcheck'], ['Doctor', 'doctor'], ['Models', 'models']] as const) {
      const p = panel(page, title)
      await expect(p.getByText('NOT BUILT', { exact: true })).toBeVisible()
      expect(await p.locator('p').first().textContent()).toBe(why(`${file}-not-built.json`))
    }
    await expect(page.getByLabel('Ask Vyom').getByRole('combobox')).toHaveCount(0)
  })

  test('TC-21-10: Given the role is not admin When selfcheck, doctor and models answer 403 Then each says not permitted for your role', async ({ page, deck }) => {
    for (const e of ['selfcheck', 'doctor', 'models'] as const) deck.use(e, { status: 403, body: { error: 'forbidden' } })
    await openConsole(page)
    for (const title of ['Self-Check', 'Doctor', 'Models']) {
      const p = panel(page, title)
      await expect(p.getByText('NOT BUILT', { exact: true })).toBeVisible()
      expect(await p.locator('p').first().textContent()).toBe('not permitted for your role')
    }
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0)
  })

  test('TC-21-11: Given /vyom/models fails When the console loads Then it says unreachable with Retry, and Retry loads the models', async ({ page, deck }) => {
    deck.use('models', { status: 500, body: { error: 'boom' } })
    await openConsole(page)
    const models = panel(page, 'Models')
    expect(await models.locator('p').first().textContent()).toBe('/vyom/models unreachable')
    await expect(panel(page, 'Health').getByText('Low disk space')).toBeVisible()

    deck.use('models', 'built')
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(models.locator('tr[data-model="llama3.1:8b"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0)
  })
})
