import { CLIENT_TELEMETRY_LIMITS, type DeviceProfile, type UserAgentBrand } from '@shared/telemetry';

/** Subset of the browser globals the profile reads; injectable for tests. */
export interface DeviceProfileEnvironment {
  navigator: Navigator;
  screen: Pick<Screen, 'width' | 'height'> | null;
  viewport: { width: number; height: number } | null;
  devicePixelRatio: number | null;
  matchMedia: ((query: string) => { matches: boolean }) | null;
  referrer: string;
  origin: string;
  webgl: { vendor: string | null; renderer: string | null };
}

export type HighEntropyHints = Pick<DeviceProfile, 'uaPlatformVersion' | 'uaModel' | 'uaArchitecture'>;

interface UserAgentData {
  brands?: UserAgentBrand[];
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
}

interface NetworkInformation {
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  saveData?: boolean;
}

type ExtendedNavigator = Navigator & {
  userAgentData?: UserAgentData;
  connection?: NetworkInformation;
  deviceMemory?: number;
};

const MAX_BRANDS = 5;
const MAX_LANGUAGES = 5;
const HIGH_ENTROPY_HINTS = ['platformVersion', 'model', 'architecture'];

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value.slice(0, CLIENT_TELEMETRY_LIMITS.MAX_TEXT_CHARS) : null;
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const bool = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

function mediaMatches(env: DeviceProfileEnvironment, query: string): boolean | null {
  return env.matchMedia ? env.matchMedia(query).matches : null;
}

function colorScheme(env: DeviceProfileEnvironment): DeviceProfile['colorScheme'] {
  const dark = mediaMatches(env, '(prefers-color-scheme: dark)');
  if (dark === null) return null;
  return dark ? 'dark' : 'light';
}

/** Cross-origin referrers only, reduced to their origin; internal navigation is not a referrer. */
export function referrerOrigin(referrer: string, ownOrigin: string): string | null {
  if (!referrer) return null;
  try {
    const origin = new URL(referrer).origin;
    return origin === ownOrigin || origin === 'null' ? null : text(origin);
  } catch {
    return null;
  }
}

function timezone(): string | null {
  try {
    return text(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

function userAgentProfile(nav: ExtendedNavigator) {
  const data = nav.userAgentData;
  return {
    userAgent: nav.userAgent.slice(0, CLIENT_TELEMETRY_LIMITS.MAX_USER_AGENT_CHARS),
    uaBrands: data?.brands?.slice(0, MAX_BRANDS).map((b) => ({ brand: text(b.brand) ?? '', version: text(b.version) ?? '' })) ?? null,
    uaMobile: bool(data?.mobile),
    uaPlatform: text(data?.platform),
    uaPlatformVersion: null,
    uaModel: null,
    uaArchitecture: null,
  };
}

function connectionProfile(connection: NetworkInformation | undefined) {
  return {
    connectionType: text(connection?.effectiveType),
    connectionRttMs: num(connection?.rtt),
    connectionDownlinkMbps: num(connection?.downlink),
    saveData: bool(connection?.saveData),
  };
}

export function collectDeviceProfile(env: DeviceProfileEnvironment): DeviceProfile {
  const nav = env.navigator as ExtendedNavigator;
  return {
    ...userAgentProfile(nav),
    language: text(nav.language),
    languages: (nav.languages ?? []).slice(0, MAX_LANGUAGES).map((language) => language.slice(0, CLIENT_TELEMETRY_LIMITS.MAX_TEXT_CHARS)),
    timezone: timezone(),
    screenWidth: num(env.screen?.width),
    screenHeight: num(env.screen?.height),
    viewportWidth: num(env.viewport?.width),
    viewportHeight: num(env.viewport?.height),
    devicePixelRatio: num(env.devicePixelRatio),
    hardwareConcurrency: num(nav.hardwareConcurrency),
    deviceMemory: num(nav.deviceMemory),
    maxTouchPoints: num(nav.maxTouchPoints),
    ...connectionProfile(nav.connection),
    prefersReducedMotion: mediaMatches(env, '(prefers-reduced-motion: reduce)'),
    colorScheme: colorScheme(env),
    webglVendor: text(env.webgl.vendor),
    webglRenderer: text(env.webgl.renderer),
    referrerOrigin: referrerOrigin(env.referrer, env.origin),
  };
}

const NO_HINTS: HighEntropyHints = { uaPlatformVersion: null, uaModel: null, uaArchitecture: null };

/** Chromium-only, permission-free hints; resolves to nulls when unavailable or slow. */
export async function readHighEntropyHints(nav: Navigator, timeoutMs: number): Promise<HighEntropyHints> {
  const getValues = (nav as ExtendedNavigator).userAgentData?.getHighEntropyValues;
  if (!getValues) return NO_HINTS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<HighEntropyHints>((resolve) => {
    timer = setTimeout(() => resolve(NO_HINTS), timeoutMs);
  });
  const hints = getValues
    .call((nav as ExtendedNavigator).userAgentData, HIGH_ENTROPY_HINTS)
    .then((values) => ({
      uaPlatformVersion: text(values.platformVersion),
      uaModel: text(values.model),
      uaArchitecture: text(values.architecture),
    }))
    .catch(() => NO_HINTS);
  try {
    return await Promise.race([hints, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** GPU identification via a throwaway WebGL context that is released immediately. */
export function readWebGLInfo(createCanvas: () => HTMLCanvasElement): { vendor: string | null; renderer: string | null } {
  try {
    const gl = createCanvas().getContext('webgl');
    if (!gl) return { vendor: null, renderer: null };
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = gl.getParameter(debugInfo ? debugInfo.UNMASKED_VENDOR_WEBGL : gl.VENDOR);
    const renderer = gl.getParameter(debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { vendor: text(vendor), renderer: text(renderer) };
  } catch {
    return { vendor: null, renderer: null };
  }
}
