import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { SelfCheckPanel } from './Panels'

afterEach(cleanup)

describe('self-check panel renders from its endpoint', () => {
  it('renders own health', () => {
    const { getByText } = render(<SelfCheckPanel panel={{ built: true, own_health: 'good' }} />)
    expect(getByText('Own health: good')).toBeTruthy()
  })

  it('renders what you owe with reviews, packets and open steps', () => {
    const { getByText } = render(<SelfCheckPanel panel={{
      built: true,
      reviews: 3,
      packets: 5,
      open_steps: 2,
      attention: [{ name: 'pending review' }]
    }} />)
    expect(getByText('Reviews: 3')).toBeTruthy()
    expect(getByText('Packets: 5')).toBeTruthy()
    expect(getByText('Open steps: 2')).toBeTruthy()
    expect(getByText('pending review')).toBeTruthy()
  })

  it('shows NOT BUILT when panel is not built', () => {
    const { getByText } = render(<SelfCheckPanel panel={{ built: false, why: 'selfcheck down' }} />)
    expect(getByText('NOT BUILT')).toBeTruthy()
    expect(getByText('selfcheck down')).toBeTruthy()
  })

  it('handles empty state correctly', () => {
    const { container } = render(<SelfCheckPanel panel={{ built: true }} />)
    // Just make sure it renders without error
    expect(container).toBeTruthy()
  })
})