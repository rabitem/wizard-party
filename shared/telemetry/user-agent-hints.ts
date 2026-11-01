import type { UserAgentBrand } from './client-telemetry';
import { DeviceType, TELEMETRY_PAYLOAD_LIMITS, type ParsedUserAgent } from './telemetry-event';
import { parseUserAgent } from './user-agent';

/**
 * Refines the header-only {@link parseUserAgent} result with User-Agent Client Hints
 * (navigator.userAgentData) and touch support, which only the browser can report.
 *
 * The server (party/) sees just the User-Agent header and calls parseUserAgent directly; the
 * client_sessions projection has the browser's device profile and calls this. Both therefore share
 * one rule table and produce the same browser / OS names.
 */
export interface UserAgentHints {
  userAgent: string | null;
  brands?: readonly UserAgentBrand[] | null;
  mobile?: boolean | null;
  platform?: string | null;
  platformVersion?: string | null;
  maxTouchPoints?: number | null;
}

/** Windows 11 reports platformVersion >= 13 via client hints; the UA string still says NT 10.0. */
const WINDOWS_11_MIN_PLATFORM_MAJOR = 13;
/** iPadOS 13+ claims to be a Mac; real Macs report at most one touch point. */
const IPAD_MIN_TOUCH_POINTS = 2;

/** GREASE brands ("Not?A_Brand") and the engine brand carry no product information. */
const IGNORED_BRAND = /not.?a.?brand|chromium/i;

const BRAND_NAMES: Readonly<Record<string, string>> = {
  'Google Chrome': 'Chrome',
  'Microsoft Edge': 'Edge',
  Opera: 'Opera',
  'Samsung Internet': 'Samsung Internet',
};

const PLATFORM_NAMES: Readonly<Record<string, string>> = {
  'Chrome OS': 'ChromeOS',
  'Chromium OS': 'ChromeOS',
};

const UNKNOWN_PLATFORM = 'Unknown';

const bounded = (value: string): string => value.slice(0, TELEMETRY_PAYLOAD_LIMITS.MAX_SHORT_TEXT_LENGTH);

function browserFromBrands(brands: UserAgentHints['brands']): Pick<ParsedUserAgent, 'browserName' | 'browserVersion'> | null {
  const brand = brands?.find((candidate) => !IGNORED_BRAND.test(candidate.brand));
  if (!brand) return null;
  return { browserName: bounded(BRAND_NAMES[brand.brand] ?? brand.brand), browserVersion: bounded(brand.version) };
}

function osVersionFromHints(osName: string, platformVersion: string | null | undefined): string | null {
  if (!platformVersion) return null;
  if (osName !== 'Windows') return bounded(platformVersion);
  return Number.parseInt(platformVersion, 10) >= WINDOWS_11_MIN_PLATFORM_MAJOR ? '11' : '10';
}

function osFromPlatform(
  hints: UserAgentHints,
  parsed: ParsedUserAgent
): Pick<ParsedUserAgent, 'osName' | 'osVersion'> {
  const platform = hints.platform && hints.platform !== UNKNOWN_PLATFORM ? hints.platform : null;
  if (!platform) return { osName: parsed.osName, osVersion: parsed.osVersion };
  const osName = bounded(PLATFORM_NAMES[platform] ?? platform);
  // The UA string's version is only trustworthy when it describes the same OS.
  const fallbackVersion = osName === parsed.osName ? parsed.osVersion : null;
  return { osName, osVersion: osVersionFromHints(osName, hints.platformVersion) ?? fallbackVersion };
}

function refineDeviceType(parsed: ParsedUserAgent, osName: string | null, hints: UserAgentHints): DeviceType {
  if (parsed.deviceType === DeviceType.BOT || parsed.deviceType === DeviceType.TABLET) return parsed.deviceType;
  if (osName === 'macOS' && (hints.maxTouchPoints ?? 0) >= IPAD_MIN_TOUCH_POINTS) return DeviceType.TABLET;
  if (hints.mobile === true) return DeviceType.MOBILE;
  if (parsed.deviceType === DeviceType.UNKNOWN && osName) return DeviceType.DESKTOP;
  return parsed.deviceType;
}

export function parseUserAgentWithHints(hints: UserAgentHints): ParsedUserAgent {
  const parsed = parseUserAgent(hints.userAgent);
  const os = osFromPlatform(hints, parsed);
  // A crawler's brand list would hide the bot name; keep the header classification for bots.
  const browser = parsed.deviceType === DeviceType.BOT ? null : browserFromBrands(hints.brands);
  return {
    browserName: browser?.browserName ?? parsed.browserName,
    browserVersion: browser?.browserVersion ?? parsed.browserVersion,
    ...os,
    deviceType: refineDeviceType(parsed, os.osName, hints),
  };
}
