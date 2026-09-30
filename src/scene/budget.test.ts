import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startTicker } from './budget'

let hidden = false
function setHidden(value: boolean) {
  hidden = value
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers()
  hidden = false
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  delete (document as { hidden?: boolean }).hidden
})

describe('startTicker', () => {
  it('TC-10-21: schedules about 24 frames per visible second', () => {
    const invalidate = vi.fn()
    const stop = startTicker(invalidate)

    vi.advanceTimersByTime(1000)

    expect(invalidate.mock.calls.length).toBeGreaterThanOrEqual(23)
    expect(invalidate.mock.calls.length).toBeLessThanOrEqual(25)
    stop()
  })

  it('TC-10-22: stops while the document is hidden and resumes when it is visible again', () => {
    const invalidate = vi.fn()
    const stop = startTicker(invalidate)
    vi.advanceTimersByTime(500)
    const beforeHide = invalidate.mock.calls.length

    setHidden(true)
    vi.advanceTimersByTime(2000)
    expect(invalidate.mock.calls.length).toBe(beforeHide)

    setHidden(false)
    vi.advanceTimersByTime(1000)
    expect(invalidate.mock.calls.length - beforeHide).toBeGreaterThanOrEqual(23)
    stop()
  })

  it('TC-10-23: unmount clears the interval and removes the visibilitychange listener', () => {
    const added = vi.spyOn(document, 'addEventListener')
    const removed = vi.spyOn(document, 'removeEventListener')
    const cleared = vi.spyOn(window, 'clearInterval')
    const invalidate = vi.fn()
    const stop = startTicker(invalidate)
    const listener = added.mock.calls.find(([type]) => type === 'visibilitychange')?.[1]

    stop()
    const atStop = invalidate.mock.calls.length
    vi.advanceTimersByTime(2000)
    setHidden(false)
    vi.advanceTimersByTime(2000)

    expect(cleared).toHaveBeenCalledTimes(1)
    expect(listener).toBeDefined()
    expect(removed).toHaveBeenCalledWith('visibilitychange', listener)
    expect(invalidate.mock.calls.length).toBe(atStop)
  })

  it('TC-10-24: mounting while the document is already hidden schedules no frames', () => {
    hidden = true
    const invalidate = vi.fn()
    const stop = startTicker(invalidate)

    vi.advanceTimersByTime(3000)

    expect(invalidate).not.toHaveBeenCalled()
    stop()
  })
})
