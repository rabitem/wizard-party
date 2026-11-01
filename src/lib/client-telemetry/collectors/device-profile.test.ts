import { describe, expect, it } from 'vitest';

import { collectDeviceProfile, readHighEntropyHints, readWebGLInfo, referrerOrigin, type DeviceProfileEnvironment } from './device-profile';

function env(navigatorOverrides: Record<string, unknown> = {}): DeviceProfileEnvironment {
  return {
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
      language: 'de-DE',
      languages: ['de-DE', 'de', 'en-US', 'en', 'fr', 'it', 'es'],
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      deviceMemory: 8,
      userAgentData: { brands: [{ brand: 'Google Chrome', version: '130' }], mobile: false, platform: 'Windows' },
      connection: { effectiveType: '4g', rtt: 50, downlink: 10, saveData: false },
      ...navigatorOverrides,
    } as unknown as Navigator,
    screen: { width: 2560, height: 1440 },
    viewport: { width: 1280, height: 720 },
    devicePixelRatio: 2,
    matchMedia: (query) => ({ matches: query.includes('dark') }),
    referrer: 'https://www.google.com/search?q=wizard',
    origin: 'https://wizardparty.fun',
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 3080)' },
  };
}

describe('collectDeviceProfile', () => {
  it('collects the device and browser profile', () => {
    const profile = collectDeviceProfile(env());
    expect(profile).toMatchObject({
      uaBrands: [{ brand: 'Google Chrome', version: '130' }],
      uaMobile: false,
      uaPlatform: 'Windows',
      language: 'de-DE',
      screenWidth: 2560,
      viewportHeight: 720,
      devicePixelRatio: 2,
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connectionType: '4g',
      connectionRttMs: 50,
      saveData: false,
      prefersReducedMotion: false,
      colorScheme: 'dark',
      webglRenderer: 'ANGLE (NVIDIA GeForce RTX 3080)',
      referrerOrigin: 'https://www.google.com',
    });
    expect(profile.languages).toHaveLength(5);
    expect(typeof profile.timezone).toBe('string');
  });

  it('degrades to nulls on browsers without optional APIs', () => {
    const profile = collectDeviceProfile({
      ...env({ userAgentData: undefined, connection: undefined, deviceMemory: undefined }),
      matchMedia: null,
      screen: null,
    });
    expect(profile).toMatchObject({
      uaBrands: null,
      uaMobile: null,
      deviceMemory: null,
      connectionType: null,
      colorScheme: null,
      prefersReducedMotion: null,
      screenWidth: null,
    });
  });
});

describe('referrerOrigin', () => {
  it('keeps only cross-origin referrer origins', () => {
    expect(referrerOrigin('https://reddit.com/r/boardgames/xyz?u=1', 'https://wizardparty.fun')).toBe('https://reddit.com');
    expect(referrerOrigin('https://wizardparty.fun/lobby', 'https://wizardparty.fun')).toBeNull();
    expect(referrerOrigin('', 'https://wizardparty.fun')).toBeNull();
    expect(referrerOrigin('not a url', 'https://wizardparty.fun')).toBeNull();
  });
});

describe('readHighEntropyHints', () => {
  it('returns granted hints', async () => {
    const nav = {
      userAgentData: {
        getHighEntropyValues: async () => ({ platformVersion: '15.0.0', model: '', architecture: 'x86' }),
      },
    } as unknown as Navigator;
    await expect(readHighEntropyHints(nav, 100)).resolves.toEqual({
      uaPlatformVersion: '15.0.0',
      uaModel: null,
      uaArchitecture: 'x86',
    });
  });

  it('falls back to nulls when unsupported, rejected or too slow', async () => {
    const none = { uaPlatformVersion: null, uaModel: null, uaArchitecture: null };
    await expect(readHighEntropyHints({} as Navigator, 10)).resolves.toEqual(none);
    const rejecting = { userAgentData: { getHighEntropyValues: () => Promise.reject(new Error('denied')) } } as unknown as Navigator;
    await expect(readHighEntropyHints(rejecting, 10)).resolves.toEqual(none);
    const hanging = { userAgentData: { getHighEntropyValues: () => new Promise(() => {}) } } as unknown as Navigator;
    await expect(readHighEntropyHints(hanging, 10)).resolves.toEqual(none);
  });
});

describe('readWebGLInfo', () => {
  it('reads unmasked GPU info and releases the context', () => {
    let lost = false;
    const gl = {
      VENDOR: 1,
      RENDERER: 2,
      getExtension: (name: string) =>
        name === 'WEBGL_debug_renderer_info'
          ? { UNMASKED_VENDOR_WEBGL: 10, UNMASKED_RENDERER_WEBGL: 11 }
          : { loseContext: () => { lost = true; } },
      getParameter: (param: number) => ({ 10: 'Apple', 11: 'Apple M2' })[param as 10 | 11],
    };
    const info = readWebGLInfo(() => ({ getContext: () => gl }) as unknown as HTMLCanvasElement);
    expect(info).toEqual({ vendor: 'Apple', renderer: 'Apple M2' });
    expect(lost).toBe(true);
  });

  it('returns nulls without WebGL', () => {
    expect(readWebGLInfo(() => ({ getContext: () => null }) as unknown as HTMLCanvasElement)).toEqual({ vendor: null, renderer: null });
    expect(readWebGLInfo(() => { throw new Error('no DOM'); })).toEqual({ vendor: null, renderer: null });
  });
});
