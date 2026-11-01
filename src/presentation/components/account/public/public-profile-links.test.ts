import { describe, expect, it } from 'vitest';

import { publicProfilePath, resolveProfileHandle } from './public-profile-links';

describe('resolveProfileHandle', () => {
  it('should serve the lowercase handle as the canonical URL', () => {
    expect(resolveProfileHandle('merlin.the_wise')).toEqual({ kind: 'canonical', username: 'merlin.the_wise' });
  });

  it('should redirect other casings, padding and encoded spellings to the canonical URL', () => {
    for (const raw of ['Merlin', 'MERLIN', 'merlin%20', '%20Merlin', '%6Derlin']) {
      expect(resolveProfileHandle(raw)).toEqual({ kind: 'redirect', username: 'merlin' });
    }
  });

  it('should not resolve malformed or invalid handles', () => {
    expect(resolveProfileHandle('%E0%A4%A')).toEqual({ kind: 'not-found' });
    expect(resolveProfileHandle('a')).toEqual({ kind: 'not-found' });
    expect(resolveProfileHandle('admin')).toEqual({ kind: 'not-found' });
    expect(resolveProfileHandle('mer%2Flin')).toEqual({ kind: 'not-found' });
  });
});

describe('publicProfilePath', () => {
  it('should link a profile at /u/<handle>', () => {
    expect(publicProfilePath('merlin.the_wise')).toBe('/u/merlin.the_wise');
  });
});
