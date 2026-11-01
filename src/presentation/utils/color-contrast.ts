/**
 * WCAG 2.x contrast helpers for HUD text colours.
 */

type Rgb = readonly [number, number, number];

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const WHITE: Rgb = [255, 255, 255];
/** Fraction mixed toward white per step when lifting a colour's contrast */
const LIGHTEN_STEP = 0.05;

function parseHexColor(hex: string): Rgb | null {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) return null;
  const digits = match[1].length === 3
    ? match[1].split('').map((digit) => digit + digit).join('')
    : match[1];
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function linearChannel(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0 black .. 1 white). */
function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * linearChannel(rgb[0]) + 0.7152 * linearChannel(rgb[1]) + 0.0722 * linearChannel(rgb[2]);
}

/** WCAG contrast ratio of two hex colours (1..21); 1 when either cannot be parsed. */
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg) return 1;
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

/**
 * The colour itself when it already reaches `minRatio` against a dark background, otherwise the
 * least-lightened tint of it (mixed toward white) that does. Keeps the hue recognisable.
 */
export function ensureContrastOnDark(color: string, background: string, minRatio: number): string {
  const rgb = parseHexColor(color);
  if (!rgb || contrastRatio(color, background) >= minRatio) return color;
  for (let amount = LIGHTEN_STEP; amount < 1; amount += LIGHTEN_STEP) {
    const candidate = toHex(mix(rgb, WHITE, amount));
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }
  return toHex(WHITE);
}
