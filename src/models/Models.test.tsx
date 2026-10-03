import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModelsPanel } from './Models'

describe('ModelsPanel', () => {
  it('TC-21-03: renders model information correctly when built=true', async () => {
    const mockPanel = {
      built: true as const,
      default: 'gpt-4',
      models: [
        { name: 'gpt-4', default: true },
        { name: 'claude-3', default: false },
        { name: 'llama-2', default: false }
      ],
      build_loop_evidence: {
        'gpt-4': { calls: 100, minutes: 50, slices_ok: 95, first_try: 87 },
        'claude-3': { calls: 80, minutes: 40, slices_ok: 90, first_try: 75 },
        'llama-2': { calls: 120, minutes: 60, slices_ok: 85, first_try: 60 }
      }
    }

    render(<ModelsPanel panel={mockPanel} />)

    // Check that the component renders the correct information
    expect(screen.getByText('Default model: gpt-4')).toBeTruthy()
    expect(screen.getByText('Available models:')).toBeTruthy()
    expect(screen.getByText('gpt-4')).toBeTruthy()
    expect(screen.getByText('claude-3')).toBeTruthy()
    expect(screen.getByText('llama-2')).toBeTruthy()
  })

  it('TC-21-03: shows not built message when built=false', async () => {
    const mockPanel = {
      built: false as const,
      why: 'not implemented yet'
    }

    render(<ModelsPanel panel={mockPanel} />)

    // Should render the NOT BUILT information
    expect(screen.getByText('NOT BUILT')).toBeTruthy()
    expect(screen.getByText('not implemented yet')).toBeTruthy()
  })
})