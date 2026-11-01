import { starPoints, type GlyphPen } from './glyph-pen';

/** Adds one glyph's outline to the current path (unit em box, centred on 0) */
export type GlyphBuilder = (pen: GlyphPen) => void;

const DEG = Math.PI / 180;

function heart(pen: GlyphPen, scale = 1): void {
  const s = scale;
  pen.moveTo(0, 0.42 * s);
  pen.curveTo(-0.55 * s, 0.02 * s, -0.36 * s, -0.5 * s, 0, -0.2 * s);
  pen.curveTo(0.36 * s, -0.5 * s, 0.55 * s, 0.02 * s, 0, 0.42 * s);
  pen.close();
}

function sun(pen: GlyphPen, hollow: boolean): void {
  pen.circle(0, 0, 0.22);
  if (hollow) pen.circle(0, 0, 0.13, true);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const ray = (r: number, da: number) => [Math.cos(a + da) * r, Math.sin(a + da) * r] as const;
    pen.polygon([ray(0.28, -0.2), ray(0.5, 0), ray(0.28, 0.2)]);
  }
}

/** Crescent bulging left (☾); `mirror` turns it into ☽ */
function crescent(pen: GlyphPen, mirror: boolean): void {
  const p = mirror ? pen.rotated(Math.PI) : pen;
  // Outer circle r 0.42 at the origin minus a circle r 0.36 at (0.2, 0)
  p.arc(0, 0, 0.42, 58.9 * DEG, 301.1 * DEG);
  p.arc(0.2, 0, 0.36, 272.7 * DEG, 87.3 * DEG, true);
  p.close();
}

function spade(pen: GlyphPen): void {
  pen.moveTo(0, -0.46);
  pen.curveTo(0.58, -0.02, 0.38, 0.36, 0, 0.12);
  pen.curveTo(-0.38, 0.36, -0.58, -0.02, 0, -0.46);
  pen.close();
  stem(pen);
}

function stem(pen: GlyphPen): void {
  pen.polygon([[-0.05, 0.08], [0.05, 0.08], [0.16, 0.46], [-0.16, 0.46]]);
}

function club(pen: GlyphPen): void {
  pen.circle(0, -0.22, 0.18);
  pen.circle(-0.21, 0.06, 0.18);
  pen.circle(0.21, 0.06, 0.18);
  pen.circle(0, 0, 0.1);
  stem(pen);
}

/** Card suits, geometric shapes, stars and celestial symbols */
export const BASIC_GLYPHS: Readonly<Record<string, GlyphBuilder>> = {
  '♥': (pen) => heart(pen),
  '♦': (pen) => pen.polygon([[0, -0.48], [0.34, 0], [0, 0.48], [-0.34, 0]]),
  '♠': spade,
  '♣': club,
  '◆': (pen) => pen.polygon([[0, -0.46], [0.42, 0], [0, 0.46], [-0.42, 0]]),
  '▲': (pen) => pen.polygon([[0, -0.42], [0.46, 0.38], [-0.46, 0.38]]),
  '●': (pen) => pen.circle(0, 0, 0.4),
  '★': (pen) => pen.polygon(starPoints(5, 0.5, 0.2)),
  '☆': (pen) => {
    pen.polygon(starPoints(5, 0.5, 0.2));
    pen.polygon(starPoints(5, 0.34, 0.13).reverse());
  },
  '✦': (pen) => pen.polygon(starPoints(4, 0.5, 0.13)),
  '✶': (pen) => pen.polygon(starPoints(6, 0.5, 0.2)),
  '✹': (pen) => pen.polygon(starPoints(12, 0.5, 0.28)),
  '✺': (pen) => pen.polygon(starPoints(16, 0.5, 0.3)),
  '☀': (pen) => sun(pen, false),
  '☼': (pen) => sun(pen, true),
  '☾': (pen) => crescent(pen, false),
  '☽': (pen) => crescent(pen, true),
  '☄': (pen) => {
    pen.circle(0.18, -0.18, 0.2);
    pen.polygon([[0.02, -0.33], [0.33, -0.02], [-0.48, 0.48]]);
  },
  '≈': (pen) => {
    pen.waveBand({ v: -0.13, amplitude: 0.07, thickness: 0.1, x0: -0.45, x1: 0.45, waves: 1.5 });
    pen.waveBand({ v: 0.13, amplitude: 0.07, thickness: 0.1, x0: -0.45, x1: 0.45, waves: 1.5 });
  },
  '∿': (pen) => pen.waveBand({ v: 0, amplitude: 0.18, thickness: 0.12, x0: -0.45, x1: 0.45, waves: 1 }),
  '❦': (pen) => {
    heart(pen, 0.85);
    pen.arcBand(0.12, -0.36, 0.12, 0.06, 180 * DEG, 330 * DEG);
  },
  '❧': (pen) => {
    const p = pen.rotated(-Math.PI / 2);
    heart(p, 0.85);
    p.arcBand(0.12, -0.36, 0.12, 0.06, 180 * DEG, 330 * DEG);
  },
};
