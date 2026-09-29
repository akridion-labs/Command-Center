import { describe, it, expect } from 'vitest';
import { Panel } from './api';

describe('Panel type', () => {
  it('should correctly define Panel type', () => {
    // This is a compile-time test to ensure the Panel type works as expected
    const builtPanel: Panel<{ test: string }> = {
      built: true,
      test: 'value'
    };

    const notBuiltPanel: Panel<{ test: string }> = {
      built: false,
      why: 'not implemented yet'
    };

    expect(builtPanel.built).toBe(true);
    expect(notBuiltPanel.built).toBe(false);
  });
});