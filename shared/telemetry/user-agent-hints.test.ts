import { describe, expect, it } from 'vitest';

import { DeviceType } from './telemetry-event';
import { parseUserAgentWithHints } from './user-agent-hints';

const UA = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  androidPhone:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  headless:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36',
  reducedChrome: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

describe('parseUserAgentWithHints', () => {
  it('falls back to the header parser without hints', () => {
    expect(parseUserAgentWithHints({ userAgent: UA.chromeWindows })).toEqual({
      browserName: 'Chrome',
      browserVersion: '130.0.0.0',
      osName: 'Windows',
      osVersion: '10',
      deviceType: DeviceType.DESKTOP,
    });
  });

  it('prefers client hint brands and recognises Windows 11 by platformVersion', () => {
    expect(
      parseUserAgentWithHints({
        userAgent: UA.chromeWindows,
        brands: [
          { brand: 'Not?A_Brand', version: '99' },
          { brand: 'Chromium', version: '130' },
          { brand: 'Microsoft Edge', version: '130' },
        ],
        platform: 'Windows',
        platformVersion: '15.0.0',
        mobile: false,
      })
    ).toEqual({ browserName: 'Edge', browserVersion: '130', osName: 'Windows', osVersion: '11', deviceType: DeviceType.DESKTOP });
  });

  it('reports Windows 10 for platformVersion below 13', () => {
    expect(parseUserAgentWithHints({ userAgent: UA.chromeWindows, platform: 'Windows', platformVersion: '10.0.0' }).osVersion).toBe(
      '10'
    );
  });

  it('uses the platform hint when the UA string is reduced', () => {
    expect(
      parseUserAgentWithHints({ userAgent: UA.reducedChrome, platform: 'Chrome OS', platformVersion: '16002.44.0' })
    ).toMatchObject({ osName: 'ChromeOS', osVersion: '16002.44.0', deviceType: DeviceType.DESKTOP });
  });

  it('drops the UA version when the platform hint names a different OS', () => {
    expect(parseUserAgentWithHints({ userAgent: UA.reducedChrome, platform: 'Android' })).toMatchObject({
      osName: 'Android',
      osVersion: null,
    });
  });

  it('ignores the "Unknown" platform hint', () => {
    expect(parseUserAgentWithHints({ userAgent: UA.chromeWindows, platform: 'Unknown' }).osName).toBe('Windows');
  });

  it('detects iPadOS that reports itself as macOS by touch points', () => {
    expect(parseUserAgentWithHints({ userAgent: UA.safariMac, maxTouchPoints: 5 }).deviceType).toBe(DeviceType.TABLET);
    expect(parseUserAgentWithHints({ userAgent: UA.safariMac, maxTouchPoints: 0 }).deviceType).toBe(DeviceType.DESKTOP);
  });

  it('uses the mobile hint but never downgrades a tablet', () => {
    expect(parseUserAgentWithHints({ userAgent: UA.reducedChrome, mobile: true }).deviceType).toBe(DeviceType.MOBILE);
    expect(parseUserAgentWithHints({ userAgent: UA.androidTablet, mobile: true }).deviceType).toBe(DeviceType.TABLET);
    expect(parseUserAgentWithHints({ userAgent: UA.androidPhone }).deviceType).toBe(DeviceType.MOBILE);
  });

  it('keeps bot classification even when brands are present', () => {
    expect(
      parseUserAgentWithHints({ userAgent: UA.headless, brands: [{ brand: 'Google Chrome', version: '130' }] })
    ).toMatchObject({ browserName: 'HeadlessChrome', deviceType: DeviceType.BOT });
  });

  it('bounds hint strings', () => {
    const long = 'x'.repeat(1000);
    const parsed = parseUserAgentWithHints({ userAgent: null, brands: [{ brand: long, version: long }], platform: long });
    expect(parsed.browserName?.length).toBe(100);
    expect(parsed.browserVersion?.length).toBe(100);
    expect(parsed.osName?.length).toBe(100);
  });

  it('returns unknowns for missing input', () => {
    expect(parseUserAgentWithHints({ userAgent: null })).toEqual({
      browserName: null,
      browserVersion: null,
      osName: null,
      osVersion: null,
      deviceType: DeviceType.UNKNOWN,
    });
  });
});
