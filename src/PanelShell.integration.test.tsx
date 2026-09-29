import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { PanelShell } from './PanelShell';
import { NotBuilt } from './NotBuilt';
import { get } from './api';

// Mock the global fetch function
const mockFetch = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  // @ts-expect-error - mocking global fetch
  global.fetch = mockFetch;
});

describe('PanelShell with NotBuilt integration', () => {
  it('should render NotBuilt component when panel is not built', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 403,
      ok: false
    });

    // This test verifies that the PanelShell can properly handle a NotBuilt panel
    const panel = await get('/api/test');

    expect(panel.built).toBe(false);
    expect(panel.why).toBe('not permitted for your role');
  });

  it('should render built panel data correctly', async () => {
    const testData = { value: 'test data' };
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => testData
    });

    const panel = await get('/api/test');

    expect(panel.built).toBe(true);
    expect(panel.value).toBe('test data');
  });
});