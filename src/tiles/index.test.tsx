import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Tile from './Tile'
import TileShell from './TileShell'

describe('tiles', () => {
  it('tile renders built content', () => {
    const { getByText } = render(
      <Tile title="Test Tile" built={true}>
        <div>built content</div>
      </Tile>
    )
    expect(getByText('built content')).toBeTruthy()
  })

  it('tile renders not built message', () => {
    const { getByText } = render(
      <Tile title="Test Tile" built={false} why="not available">
        <div>built content</div>
      </Tile>
    )
    expect(getByText('NOT BUILT')).toBeTruthy()
    expect(getByText('not available')).toBeTruthy()
  })

  it('tile shell renders with badge', () => {
    const { getByText } = render(
      <TileShell title="Test Tile" badge="test">
        <div>content</div>
      </TileShell>
    )
    expect(getByText('Test Tile')).toBeTruthy()
    expect(getByText('test')).toBeTruthy()
  })
})