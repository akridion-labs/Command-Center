import { describe, it, expect, vi, beforeEach } from 'vitest'
import { get } from './api'

// Mock the global fetch function
const mockFetch = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  global.fetch = mockFetch
})

describe('get function', () => {
  it('should return built data when status is 200', async () => {
    const testData = { message: 'success' }
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => testData
    })

    const result = await get<{message: string}>('/api/test')

    // For built: true, the result should be of type T with built: true property
    expect(result).toEqual({ ...testData, built: true })
  })

  it('should redirect to login when status is 401', async () => {
    // Mock location.href
    const mockLocation = { href: '' }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true
    })

    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false
    })

    // Since this throws an error, we need to catch it properly
    try {
      await get('/api/test')
      expect.fail('Expected an error to be thrown')
    } catch (error: any) {
      expect(error.message).toBe('login')
      expect(mockLocation.href).toBe('/vyom/login')
    }
  })

  it('should return not permitted error when status is 403', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 403,
      ok: false
    })

    const result = await get<{message: string}>('/api/test')

    expect(result).toEqual({ built: false, why: 'not permitted for your role' })
  })

  it('should return not implemented error when status is 501', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 501,
      ok: false
    })

    const result = await get<{message: string}>('/api/test')

    expect(result).toEqual({ built: false, why: 'not implemented yet' })
  })

  it('should throw error for other non-ok statuses', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 500,
      ok: false
    })

    await expect(get('/api/test')).rejects.toThrow('HTTP 500')
  })
})

describe('Panel type behavior', () => {
  it('should properly handle built panels', async () => {
    const testData = { value: 'test data' }
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => testData
    })

    const result = await get<{value: string}>('/api/test')

    expect(result.built).toBe(true)
    // @ts-expect-error - panel.value only exists when built is true
    expect(result.value).toBe('test data')
  })

  it('should properly handle not built panels', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 403,
      ok: false
    })

    const result = await get<{value: string}>('/api/test')

    expect(result.built).toBe(false)
    // @ts-expect-error - panel.why only exists when built is false
    expect(result.why).toBe('not permitted for your role')
  })
})