import { describe, expect, it } from 'vitest';

import { DeviceType, TELEMETRY_PAYLOAD_LIMITS, type ParsedUserAgent } from './telemetry-event';
import { boundedText, truncateText } from './telemetry-text';
import { parseUserAgent } from './user-agent';

type Case = [label: string, userAgent: string, expected: ParsedUserAgent];

const ua = (
  browserName: string | null,
  browserVersion: string | null,
  osName: string | null,
  osVersion: string | null,
  deviceType: DeviceType
): ParsedUserAgent => ({ browserName, browserVersion, osName, osVersion, deviceType });

const CASES: Case[] = [
  [
    'Chrome on Windows',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    ua('Chrome', '130.0.0.0', 'Windows', '10', DeviceType.DESKTOP),
  ],
  [
    'Edge on Windows',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.56',
    ua('Edge', '130.0.2849.56', 'Windows', '10', DeviceType.DESKTOP),
  ],
  [
    'Firefox on Windows 7',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0',
    ua('Firefox', '115.0', 'Windows', '7', DeviceType.DESKTOP),
  ],
  [
    'Safari on macOS',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    ua('Safari', '18.1', 'macOS', '10.15.7', DeviceType.DESKTOP),
  ],
  [
    'Firefox on macOS',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0',
    ua('Firefox', '131.0', 'macOS', '14.5', DeviceType.DESKTOP),
  ],
  [
    'Opera on macOS',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/115.0.0.0',
    ua('Opera', '115.0.0.0', 'macOS', '10.15.7', DeviceType.DESKTOP),
  ],
  [
    'Firefox on Linux',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
    ua('Firefox', '131.0', 'Linux', null, DeviceType.DESKTOP),
  ],
  [
    'Chrome on ChromeOS',
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    ua('Chrome', '130.0.0.0', 'ChromeOS', '14541.0.0', DeviceType.DESKTOP),
  ],
  [
    'Safari on iPhone',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    ua('Safari', '18.1', 'iOS', '18.1', DeviceType.MOBILE),
  ],
  [
    'Chrome on iPhone',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
    ua('Chrome', '130.0.6723.90', 'iOS', '17.6.1', DeviceType.MOBILE),
  ],
  [
    'Firefox on iPhone',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15',
    ua('Firefox', '132.0', 'iOS', '18.0', DeviceType.MOBILE),
  ],
  [
    'Edge on iPhone',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/130.2849.80 Mobile/15E148 Safari/605.1.15',
    ua('Edge', '130.2849.80', 'iOS', '18.0', DeviceType.MOBILE),
  ],
  [
    'Safari on iPad',
    'Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    ua('Safari', '16.6', 'iPadOS', '16.7', DeviceType.TABLET),
  ],
  [
    'Chrome on Android phone',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36',
    ua('Chrome', '130.0.6723.102', 'Android', '14', DeviceType.MOBILE),
  ],
  [
    'Chrome on Android tablet',
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    ua('Chrome', '130.0.0.0', 'Android', '13', DeviceType.TABLET),
  ],
  [
    'Samsung Internet on Android',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
    ua('Samsung Internet', '26.0', 'Android', '14', DeviceType.MOBILE),
  ],
  [
    'Firefox on Android phone',
    'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
    ua('Firefox', '132.0', 'Android', '14', DeviceType.MOBILE),
  ],
  [
    'Firefox on Android tablet',
    'Mozilla/5.0 (Android 14; Tablet; rv:132.0) Gecko/132.0 Firefox/132.0',
    ua('Firefox', '132.0', 'Android', '14', DeviceType.TABLET),
  ],
  [
    'Opera Mobile on Android',
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 OPR/85.0.0.0',
    ua('Opera', '85.0.0.0', 'Android', '10', DeviceType.MOBILE),
  ],
  [
    'Android WebView',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36',
    ua('Android WebView', '130.0.6723.102', 'Android', '14', DeviceType.MOBILE),
  ],
  [
    'phone brand containing "bot" is not a bot',
    'Mozilla/5.0 (Linux; Android 12; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    ua('Chrome', '130.0.0.0', 'Android', '12', DeviceType.MOBILE),
  ],
  [
    'Googlebot smartphone',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    ua('Googlebot', null, 'Android', '6.0.1', DeviceType.BOT),
  ],
  [
    'Bingbot',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    ua('Bingbot', null, null, null, DeviceType.BOT),
  ],
  [
    'Discord link preview',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    ua('Discordbot', null, null, null, DeviceType.BOT),
  ],
  [
    'Headless Chrome',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36',
    ua('HeadlessChrome', null, 'Linux', null, DeviceType.BOT),
  ],
  ['curl', 'curl/8.7.1', ua('curl', null, null, null, DeviceType.BOT)],
  ['generic crawler', 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)', ua('Bot', null, null, null, DeviceType.BOT)],
  ['unrecognized client', 'SomeGameClient/1.0', ua(null, null, null, null, DeviceType.UNKNOWN)],
];

describe('parseUserAgent', () => {
  it.each(CASES)('%s', (_label, userAgent, expected) => {
    expect(parseUserAgent(userAgent)).toEqual(expected);
  });

  it('returns unknown for missing headers', () => {
    expect(parseUserAgent(null)).toEqual(ua(null, null, null, null, DeviceType.UNKNOWN));
    expect(parseUserAgent('')).toEqual(ua(null, null, null, null, DeviceType.UNKNOWN));
  });

  it('only inspects a bounded prefix of hostile headers', () => {
    const padding = 'x'.repeat(TELEMETRY_PAYLOAD_LIMITS.MAX_USER_AGENT_LENGTH);
    expect(parseUserAgent(`${padding} Chrome/130.0`).browserName).toBeNull();
  });
});

describe('telemetry text bounding', () => {
  it('truncates without splitting surrogate pairs and strips characters jsonb rejects', () => {
    expect(truncateText('abcdef', 3)).toBe('abc');
    expect(truncateText('ab\u{1F600}', 3)).toBe('ab');
    expect(truncateText('a\u0000b', 10)).toBe('ab');
    expect(truncateText('a\uD800b', 10)).toBe('a�b');
  });

  it('reduces non-strings and blank strings to null', () => {
    expect(boundedText(42, 10)).toBeNull();
    expect(boundedText('   ', 10)).toBeNull();
    expect(boundedText(' de-DE ', 10)).toBe('de-DE');
  });
});
