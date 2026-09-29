import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AskBox } from './AskBox'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AskBox', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the ask box with input and button', () => {
    render(<AskBox />)

    expect(screen.getByPlaceholderText('Ask a question...')).toBeTruthy()
    expect(screen.getByText('Ask')).toBeTruthy()
  })

  it('submits a query and shows response', async () => {
    const mockResponse = {
      answer: 'This is the answer to your question',
      sources: [
        {
          title: 'Source 1',
          url: 'https://example.com/source1',
          snippet: 'This is a snippet from source 1'
        }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    render(<AskBox />)

    const input = screen.getByPlaceholderText('Ask a question...')
    const button = screen.getByText('Ask')

    fireEvent.change(input, { target: { value: 'What is the weather?' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('This is the answer to your question')).toBeTruthy()
      expect(screen.getByText('Source 1')).toBeTruthy()
      expect(screen.getByText('This is a snippet from source 1')).toBeTruthy()
    })
  })

  it('shows error when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    render(<AskBox />)

    const input = screen.getByPlaceholderText('Ask a question...')
    const button = screen.getByText('Ask')

    fireEvent.change(input, { target: { value: 'What is the weather?' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Error: HTTP 500')).toBeTruthy()
    })
  })

  it('does not submit empty query', () => {
    render(<AskBox />)

    const button = screen.getByText('Ask')
    expect(button.hasAttribute('disabled')).toBe(true)
  })
})