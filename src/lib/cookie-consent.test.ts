import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONSENT_MAX_AGE_MS,
  CONSENT_VERSION,
  COOKIE_CONSENT_KEY,
  getConsentStatus,
  hasAnalyticsConsent,
  setConsentStatus,
  subscribeToConsent,
} from './cookie-consent';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

describe('cookie consent', () => {
  beforeEach(() => {
    const target = new EventTarget();
    vi.stubGlobal('window', Object.assign(target, { localStorage: new MemoryStorage() }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('is pending until the user decides', () => {
    expect(getConsentStatus()).toBe('pending');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('records the decision with version and timestamp', () => {
    setConsentStatus('accepted');
    const record = JSON.parse(window.localStorage.getItem(COOKIE_CONSENT_KEY)!);
    expect(record).toMatchObject({ status: 'accepted', version: CONSENT_VERSION });
    expect(Date.parse(record.decidedAt)).not.toBeNaN();
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('asks again for legacy unversioned values and outdated policy versions', () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    expect(getConsentStatus()).toBe('pending');

    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ status: 'accepted', version: CONSENT_VERSION - 1, decidedAt: new Date().toISOString() })
    );
    expect(getConsentStatus()).toBe('pending');
  });

  it('expires after the maximum age', () => {
    vi.useFakeTimers();
    setConsentStatus('declined');
    expect(getConsentStatus()).toBe('declined');
    vi.advanceTimersByTime(CONSENT_MAX_AGE_MS + 1);
    expect(getConsentStatus()).toBe('pending');
  });

  it('can be withdrawn and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToConsent(listener);
    setConsentStatus('accepted');
    setConsentStatus('pending');
    expect(getConsentStatus()).toBe('pending');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setConsentStatus('declined');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
