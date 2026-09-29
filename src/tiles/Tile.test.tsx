import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Tile from './Tile'

describe('Tile component', () => {
  it('renders built content when built=true', () => {
    const { getByText } = render(
      <Tile title="Test Panel" built={true}>
        <div>built content</div>
      </Tile>
    )
    expect(getByText('built content')).toBeTruthy()
  })

  it('renders NOT BUILT message when built=false', () => {
    const { getByText } = render(
      <Tile title="Test Panel" built={false} why="not available">
        <div>built content</div>
      </Tile>
    )
    expect(getByText('NOT BUILT')).toBeTruthy()
    expect(getByText('not available')).toBeTruthy()
  })

  it('renders title correctly', () => {
    const { getByText } = render(
      <Tile title="Health Panel" built={true}>
        <div>content</div>
      </Tile>
    )
    expect(getByText('Health Panel')).toBeTruthy()
  })
})