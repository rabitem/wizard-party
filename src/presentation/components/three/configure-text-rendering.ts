import { configureTextBuilder } from 'troika-three-text';

import { UNICODE_FONTS } from '@/presentation/config/assets.config';

let configured = false;

/**
 * Points troika's fallback font lookup at our same-origin proxy. Must run before the first 3D text
 * renders (troika ignores later calls). The URL is absolute because fonts load inside a worker.
 */
export function configureTextRendering(): void {
  if (configured || typeof window === 'undefined') return;
  configured = true;
  configureTextBuilder({ unicodeFontsURL: new URL(UNICODE_FONTS.PROXY_PATH, window.location.origin).href });
}
