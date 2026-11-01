import { DeviceType, TELEMETRY_PAYLOAD_LIMITS, type ParsedUserAgent } from './telemetry-event';

/**
 * Dependency-free User-Agent parser for telemetry.
 *
 * It answers the analytical questions "which browser, which OS, which kind of device" and nothing
 * more. Rules are ordered tables (first match wins), so supporting a new browser or OS means adding
 * a row, not editing control flow. Note that iPadOS 13+ requests desktop sites by default and is
 * reported as macOS; the header alone cannot tell them apart.
 */

interface BotRule {
  name: string;
  pattern: RegExp;
}

interface BrowserRule {
  name: string;
  /** First capture group is the version. */
  pattern: RegExp;
}

interface OsRule {
  name: string;
  /** Optional first capture group is the version. */
  pattern: RegExp;
  normalizeVersion?: (raw: string) => string | null;
  deviceType: (userAgent: string) => DeviceType;
}

const MOBILE_TOKEN = /Mobi/i;
const TABLET_TOKEN = /Tablet/i;

// Specific crawlers first; the generic rule catches the long tail and HTTP libraries.
const BOT_RULES: readonly BotRule[] = [
  { name: 'Googlebot', pattern: /Googlebot/i },
  { name: 'Bingbot', pattern: /bingbot/i },
  { name: 'DuckDuckBot', pattern: /DuckDuckBot/i },
  { name: 'YandexBot', pattern: /YandexBot/i },
  { name: 'Baiduspider', pattern: /Baiduspider/i },
  { name: 'Facebook', pattern: /facebookexternalhit|facebookcatalog/i },
  { name: 'Twitterbot', pattern: /Twitterbot/i },
  { name: 'Slackbot', pattern: /Slackbot/i },
  { name: 'Discordbot', pattern: /Discordbot/i },
  { name: 'WhatsApp', pattern: /WhatsApp/i },
  { name: 'Lighthouse', pattern: /Chrome-Lighthouse|Lighthouse/i },
  { name: 'HeadlessChrome', pattern: /HeadlessChrome/i },
  { name: 'curl', pattern: /^curl\//i },
  { name: 'Wget', pattern: /^Wget\//i },
  { name: 'python-requests', pattern: /python-requests|aiohttp|python-urllib/i },
  { name: 'node-fetch', pattern: /node-fetch|undici|axios/i },
  { name: 'Go-http-client', pattern: /Go-http-client/i },
  { name: 'okhttp', pattern: /okhttp/i },
  // "[a-z]bot[/;)]" catches "AhrefsBot/7.0" and "PetalBot;" without matching phones like "CUBOT X30".
  { name: 'Bot', pattern: /[a-z]bot[/;)]|\bbot\b|crawler|spider|slurp/i },
];

// Order matters: Chromium derivatives also carry "Chrome/", and Chrome carries "Safari/".
const BROWSER_RULES: readonly BrowserRule[] = [
  { name: 'Edge', pattern: /Edg(?:e|A|iOS)?\/(\d[\d.]*)/ },
  { name: 'Opera', pattern: /(?:OPR|OPT|OPX)\/(\d[\d.]*)/ },
  { name: 'Samsung Internet', pattern: /SamsungBrowser\/(\d[\d.]*)/ },
  { name: 'Firefox', pattern: /(?:Firefox|FxiOS)\/(\d[\d.]*)/ },
  { name: 'Chrome', pattern: /CriOS\/(\d[\d.]*)/ },
  { name: 'Android WebView', pattern: /; wv\).*Chrome\/(\d[\d.]*)/ },
  { name: 'Chromium', pattern: /Chromium\/(\d[\d.]*)/ },
  { name: 'Chrome', pattern: /Chrome\/(\d[\d.]*)/ },
  { name: 'Safari', pattern: /Version\/(\d[\d.]*).*Safari\// },
];

const WINDOWS_NT_VERSIONS: Readonly<Record<string, string>> = {
  // Windows 11 still reports NT 10.0; only client hints can tell them apart.
  '10.0': '10',
  '6.3': '8.1',
  '6.2': '8',
  '6.1': '7',
  '6.0': 'Vista',
  '5.1': 'XP',
};

function underscoresToDots(raw: string): string {
  return raw.replace(/_/g, '.');
}

const desktop = (): DeviceType => DeviceType.DESKTOP;

// Order matters: iOS UAs contain "like Mac OS X", Android UAs contain "Linux".
const OS_RULES: readonly OsRule[] = [
  { name: 'iPadOS', pattern: /iPad.*? OS (\d+(?:_\d+)*)/, normalizeVersion: underscoresToDots, deviceType: () => DeviceType.TABLET },
  { name: 'iPadOS', pattern: /iPad/, deviceType: () => DeviceType.TABLET },
  {
    name: 'iOS',
    pattern: /(?:iPhone|iPod).*? OS (\d+(?:_\d+)*)/,
    normalizeVersion: underscoresToDots,
    deviceType: () => DeviceType.MOBILE,
  },
  { name: 'iOS', pattern: /iPhone|iPod/, deviceType: () => DeviceType.MOBILE },
  {
    name: 'Android',
    pattern: /Android(?: (\d+(?:\.\d+)*))?/,
    // Android tablets omit the "Mobile" token by convention; Firefox marks them with "Tablet".
    deviceType: (userAgent) =>
      TABLET_TOKEN.test(userAgent) || !MOBILE_TOKEN.test(userAgent) ? DeviceType.TABLET : DeviceType.MOBILE,
  },
  { name: 'ChromeOS', pattern: /CrOS \S+ (\d[\d.]*)/, deviceType: desktop },
  {
    name: 'Windows',
    pattern: /Windows NT (\d+\.\d+)/,
    normalizeVersion: (raw) => WINDOWS_NT_VERSIONS[raw] ?? raw,
    deviceType: desktop,
  },
  { name: 'Windows', pattern: /Windows/, deviceType: desktop },
  { name: 'macOS', pattern: /Mac OS X (\d+(?:[_.]\d+)*)/, normalizeVersion: underscoresToDots, deviceType: desktop },
  { name: 'macOS', pattern: /Macintosh/, deviceType: desktop },
  { name: 'Linux', pattern: /Linux|X11/, deviceType: desktop },
];

const UNKNOWN: ParsedUserAgent = {
  browserName: null,
  browserVersion: null,
  osName: null,
  osVersion: null,
  deviceType: DeviceType.UNKNOWN,
};

type OsMatch = Pick<ParsedUserAgent, 'osName' | 'osVersion' | 'deviceType'>;
type BrowserMatch = Pick<ParsedUserAgent, 'browserName' | 'browserVersion'>;

const NO_BROWSER: BrowserMatch = { browserName: null, browserVersion: null };

function fallbackDeviceType(userAgent: string): DeviceType {
  if (TABLET_TOKEN.test(userAgent)) return DeviceType.TABLET;
  if (MOBILE_TOKEN.test(userAgent)) return DeviceType.MOBILE;
  return DeviceType.UNKNOWN;
}

function parseOs(userAgent: string): OsMatch {
  for (const rule of OS_RULES) {
    const match = rule.pattern.exec(userAgent);
    if (!match) continue;
    const rawVersion = match[1];
    const osVersion = rawVersion ? (rule.normalizeVersion?.(rawVersion) ?? rawVersion) : null;
    return { osName: rule.name, osVersion, deviceType: rule.deviceType(userAgent) };
  }
  return { osName: null, osVersion: null, deviceType: fallbackDeviceType(userAgent) };
}

function parseBrowser(userAgent: string): BrowserMatch {
  for (const rule of BROWSER_RULES) {
    const match = rule.pattern.exec(userAgent);
    if (match) return { browserName: rule.name, browserVersion: match[1] ?? null };
  }
  return NO_BROWSER;
}

export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  if (!userAgent) return UNKNOWN;
  // Bounding the input also bounds regex work on hostile headers.
  const input = userAgent.slice(0, TELEMETRY_PAYLOAD_LIMITS.MAX_USER_AGENT_LENGTH);

  const os = parseOs(input);
  const bot = BOT_RULES.find((rule) => rule.pattern.test(input));
  if (bot) return { ...os, browserName: bot.name, browserVersion: null, deviceType: DeviceType.BOT };

  return { ...parseBrowser(input), ...os };
}
