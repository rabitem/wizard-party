import { describe, expect, it } from 'vitest';

import { describeProviderLinkResult, linkCallbackUrls } from './provider-link-result';

const labels = { google: 'Google', discord: 'Discord', github: 'GitHub' } as const;

describe('describeProviderLinkResult', () => {
  it('should confirm a connected provider', () => {
    expect(describeProviderLinkResult(new URLSearchParams('tab=security&linked=discord'), labels)).toEqual({
      tone: 'success',
      message: 'Discord connected. You can now sign in with it too.',
    });
  });

  it('should explain known and unknown link errors', () => {
    expect(describeProviderLinkResult(new URLSearchParams('error=account_already_linked_to_different_user'), labels)?.message).toMatch(/another Wizard Party account/);
    expect(describeProviderLinkResult(new URLSearchParams('error=something_else'), labels)).toMatchObject({ tone: 'error' });
  });

  it('should ignore unrelated or forged params', () => {
    expect(describeProviderLinkResult(new URLSearchParams('tab=security'), labels)).toBeNull();
    expect(describeProviderLinkResult(new URLSearchParams('linked=<script>'), labels)).toBeNull();
  });

  it('should round-trip through the callback URL', () => {
    const { callbackURL } = linkCallbackUrls('github');
    expect(describeProviderLinkResult(new URL(callbackURL, 'https://x').searchParams, labels)?.tone).toBe('success');
  });
});
