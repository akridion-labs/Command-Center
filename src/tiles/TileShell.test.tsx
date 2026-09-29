import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import TileShell from './TileShell'

describe('TileShell component', () => {
  it('renders title correctly', () => {
    const { getByText } = render(
      <TileShell title="Test Tile">
        <div>content</div>
      </TileShell>
    )
    expect(getByText('Test Tile')).toBeTruthy()
  })

  it('renders badge when provided', () => {
    const { getByText } = render(
      <TileShell title="Test Tile" badge="test">
        <div>content</div>
      </TileShell>
    )
    expect(getByText('Test Tile')).toBeTruthy()
    expect(getByText('test')).toBeTruthy()
  })

  it('renders children correctly', () => {
    const { getByText } = render(
      <TileShell title="Test Tile">
        <span>child content</span>
      </TileShell>
    )
    expect(getByText('child content')).toBeTruthy()
  })
})