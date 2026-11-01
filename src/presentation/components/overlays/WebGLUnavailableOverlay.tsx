'use client';

import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

/**
 * Shown instead of the 3D table when the browser cannot create a WebGL 2 context at all
 * (hardware acceleration off, blocklisted GPU). Retrying in a loop cannot fix that, so the
 * player gets the cause and the fix instead of an empty table.
 */
export function WebGLUnavailableOverlay() {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--surface) 98%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 50%) 99%, transparent) 100%)' }}
      role="alert"
    >
      <div
        className="relative max-w-md w-full rounded-lg px-6 py-8 text-center sm:px-8"
        style={{ background: THEME_SURFACE.MODAL_BG, border: '2px solid var(--surface-border)' }}
      >
        <i className="ra ra-crystal-ball text-3xl mb-4 inline-block" style={{ color: 'var(--accent)' }} />
        <h2 className="text-xl mb-3" style={{ fontFamily: 'Georgia, serif', color: 'var(--accent-pale)' }}>
          The table cannot be drawn
        </h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ fontFamily: 'Georgia, serif', color: 'var(--accent-parchment)' }}>
          Your browser could not start 3D graphics (WebGL 2). Turn on hardware acceleration in the
          browser settings, update the browser or graphics driver, then reload the page.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded cursor-pointer text-sm"
          style={{ background: 'color-mix(in srgb, var(--surface-border) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-dim), black 15%)', color: 'var(--accent)', fontFamily: 'Georgia, serif' }}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
