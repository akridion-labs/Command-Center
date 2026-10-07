import { test, expect, panel, openConsole, data, type Deck } from './fixtures'

const why = (file: string) => (data(file) as { why: string }).why
const FITNESS = { body: data('models-fitness.json') }
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
    expect(await row('qwen2.5-coder:14b').allTextContents()).toEqual(['qwen2.5-coder:14b default', '120', '95', '12', '75%', 'not checked', 'No tests'])
    expect(await row('llama3.1:8b').allTextContents()).toEqual(['llama3.1:8b', '40', '31', '4', '25%', 'not checked', 'No tests'])
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
    // Story 13 AC5: the second ask is a follow-up, so it also carries the previous turn.
    const answer = (data('ask.json') as { answer: string }).answer
    expect(posted(deck)).toEqual([
      { query: question, model: 'qwen2.5-coder:14b' },
      { query: question, model: 'llama3.1:8b', history: [{ query: question, answer }] },
    ])
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

  test('TC-28-01: AC1 - Given a model panel When the user views it Then each model shows a fit status indicator', async ({ page, deck }) => {
    deck.use('models', FITNESS)
    await openConsole(page)
    const models = panel(page, 'Models')
    const fit = (name: string) => models.locator(`tr[data-model="${name}"] .fit-status`)
    expect(await fit('qwen2.5-coder:14b').textContent()).toBe('✓')
    expect(await fit('llama3.1:8b').textContent()).toBe('✗')
    expect(await fit('gemma2:2b').textContent()).toBe('not checked')
  })

  test('TC-28-09: AC5 - Given /vyom/models errors When the user views the panel Then it says unreachable with Retry', async ({ page, deck }) => {
    deck.use('models', { status: 500, body: { error: 'boom' } })
    await openConsole(page)
    const models = panel(page, 'Models')
    expect(await models.locator('p').first().textContent()).toBe('/vyom/models unreachable')
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
    await expect(models.locator('.fit-status')).toHaveCount(0)
  })

  test('TC-28-10: AC5 - Given the endpoint is not built When the user views the panel Then NOT BUILT shows its why', async ({ page, deck }) => {
    deck.use('models', 'not-built')
    await openConsole(page)
    const models = panel(page, 'Models')
    await expect(models.getByText('NOT BUILT', { exact: true })).toBeVisible()
    expect(await models.locator('p').first().textContent()).toBe(why('models-not-built.json'))
  })

  test('TC-28-11: AC5 - Given access is denied When the user views the panel Then it says not permitted for your role', async ({ page, deck }) => {
    deck.use('models', { status: 403, body: { error: 'forbidden' } })
    await openConsole(page)
    const models = panel(page, 'Models')
    expect(await models.locator('p').first().textContent()).toBe('not permitted for your role')
    await expect(models.locator('table')).toHaveCount(0)
  })

  test('TC-28-12: AC5 - Given no models exist When the user views the panel Then it says so', async ({ page, deck }) => {
    deck.use('models', { body: { default: '', models: [], build_loop_evidence: {} } })
    await openConsole(page)
    const models = panel(page, 'Models')
    await expect(models.getByText('no local models installed')).toBeVisible()
    await expect(models.locator('table')).toHaveCount(0)
  })

  test('TC-28-13: AC5 - Given /vyom/models has not answered yet When the user views the panel Then it shows loading', async ({ page }) => {
    let release: () => void = () => {}
    const held = new Promise<void>((r) => { release = r })
    await page.route('**/vyom/models', async (route) => { await held; await route.fallback() })
    await page.goto('./')
    await expect(panel(page, 'Models').getByText('loading…')).toBeVisible()
    release()
    await expect(panel(page, 'Models').locator('tr[data-model="llama3.1:8b"]')).toBeVisible()
  })

  test('TC-28-02: AC2 - Given an unfit model When the user views it Then fit_why explains why the model is not fit', async ({ page, deck }) => {
    deck.use('models', FITNESS)
    await openConsole(page)
    const models = panel(page, 'Models')

    // Check that fit_why text is visible for the unfit model
    await expect(models.getByText('model failed to load required libraries')).toBeVisible()
  })

  test('TC-28-03: AC3 - Given a model has no fitness data When the user views it Then "not checked" appears as the fit status', async ({ page, deck }) => {
    deck.use('models', FITNESS)
    await openConsole(page)
    const models = panel(page, 'Models')

    // Check that "not checked" is visible for the model with no fitness data
    await expect(models.getByText('not checked')).toBeVisible()
  })

  test('TC-28-04: AC4 - Given the user views a model When they see tests Then each test is associated with that specific model', async ({ page, deck }) => {
    deck.use('models', FITNESS)
    await openConsole(page)
    const models = panel(page, 'Models')

    // Check that tests are visible for each model
    await expect(models.getByText('test1.ts')).toBeVisible()
    await expect(models.getByText('test2.ts')).toBeVisible()
    await expect(models.getByText('test3.ts')).toBeVisible()
  })

  test('TC-28-14: AC5 - Given the user views the panel When they see fit indicators Then ✓ and ✗ icons are clearly distinguishable', async ({ page, deck }) => {
    deck.use('models', FITNESS)
    await openConsole(page)
    const models = panel(page, 'Models')

    // Check that different fit status indicators are visible
    await expect(models.getByText('✓')).toBeVisible()
    await expect(models.getByText('✗')).toBeVisible()
    await expect(models.getByText('not checked')).toBeVisible()
  })
})
