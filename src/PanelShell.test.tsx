import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PanelShell } from './PanelShell';
import { NotBuilt } from './NotBuilt';

describe('PanelShell', () => {
  it('renders title correctly when panel is built', () => {
    const panel = { built: true as const };

    const { getByText } = render(
      <PanelShell panel={panel} title="Test Panel">
        {() => <p>Panel content</p>}
      </PanelShell>
    );

    expect(getByText('Test Panel')).toBeTruthy();
    expect(getByText('Panel content')).toBeTruthy();
  });
});

describe('NotBuilt', () => {
  it('renders NOT BUILT and why message', () => {
    const panel = {
      built: false as const,
      why: 'not implemented yet'
    };

    const { getByText } = render(
      <NotBuilt panel={panel} />
    );

    expect(getByText('NOT BUILT')).toBeTruthy();
    expect(getByText('not implemented yet')).toBeTruthy();
  });
});