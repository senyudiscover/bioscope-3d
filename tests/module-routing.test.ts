import { describe, expect, it } from 'vitest';
import { getModuleIdFromSearch, getSearchForModule } from '@/lib/bioscope-core';

describe('BioScope module deep-link routing', () => {
  it('accepts Brain Workbench and rejects unknown module ids', () => {
    expect(getModuleIdFromSearch('?module=brain-atlas')).toBe('brain-atlas');
    expect(getModuleIdFromSearch('?module=unknown')).toBe('human-anatomy');
  });

  it('round-trips module links without dropping other parameters', () => {
    expect(getSearchForModule('?anatomy=brain', 'brain-atlas')).toBe(
      '?anatomy=brain&module=brain-atlas',
    );
    expect(getSearchForModule('?module=brain-atlas', 'human-anatomy')).toBe('');
  });
});
