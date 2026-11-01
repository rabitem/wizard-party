import { describe, expect, it } from 'vitest';

import { APP_VERSION_FALLBACK, isReleaseVersion } from './app-version';

describe('isReleaseVersion', () => {
  it('should accept a commit sha', () => {
    expect(isReleaseVersion('7539335a1f')).toBe(true);
  });

  it('should reject the unversioned fallback, empty and missing values', () => {
    expect(isReleaseVersion(APP_VERSION_FALLBACK)).toBe(false);
    expect(isReleaseVersion('')).toBe(false);
    expect(isReleaseVersion(null)).toBe(false);
    expect(isReleaseVersion(undefined)).toBe(false);
  });
});
