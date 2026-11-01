import type { GlyphPen } from './glyph-pen';
import type { GlyphBuilder } from './glyph-shapes-basic';

const DEG = Math.PI / 180;

function hammer(pen: GlyphPen): void {
  pen.rect(0, 0.04, 0.09, 0.86);
  pen.rect(0, -0.34, 0.38, 0.15);
}

function sword(pen: GlyphPen): void {
  pen.polygon([[-0.035, 0.18], [-0.035, -0.4], [0, -0.5], [0.035, -0.4], [0.035, 0.18]]);
  pen.rect(0, 0.2, 0.28, 0.06);
  pen.rect(0, 0.33, 0.06, 0.2);
  pen.circle(0, 0.45, 0.05);
}

function gear(pen: GlyphPen): void {
  const teeth = 8;
  const points: Array<readonly [number, number]> = [];
  for (let k = 0; k < teeth; k++) {
    const base = (k * Math.PI * 2) / teeth;
    for (const [da, r] of [[-0.2, 0.36], [-0.13, 0.5], [0.13, 0.5], [0.2, 0.36]] as const) {
      points.push([Math.cos(base + da) * r, Math.sin(base + da) * r]);
    }
  }
  pen.polygon(points);
  pen.circle(0, 0, 0.15, true);
}

function snowflake(pen: GlyphPen): void {
  for (let k = 0; k < 6; k++) {
    const arm = pen.rotated((k * Math.PI) / 3);
    arm.rect(0, -0.24, 0.07, 0.5);
    arm.rect(-0.07, -0.33, 0.05, 0.18, -Math.PI / 4);
    arm.rect(0.07, -0.33, 0.05, 0.18, Math.PI / 4);
  }
}

function flower(pen: GlyphPen, petals: number, petalLength: number): void {
  for (let k = 0; k < petals; k++) {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / petals;
    pen.ellipse(Math.cos(a) * 0.25, Math.sin(a) * 0.25, petalLength, 0.13, a);
  }
  pen.circle(0, 0, 0.13);
}

function crown(pen: GlyphPen): void {
  pen.polygon([[-0.4, 0.3], [-0.43, -0.24], [-0.21, 0.02], [0, -0.36], [0.21, 0.02], [0.43, -0.24], [0.4, 0.3]]);
  pen.rect(0, 0.37, 0.84, 0.1);
  pen.circle(-0.43, -0.3, 0.06);
  pen.circle(0, -0.42, 0.06);
  pen.circle(0.43, -0.3, 0.06);
}

function cross(pen: GlyphPen, barV: number, barWidth: number, thickness: number): void {
  pen.rect(0, 0, thickness, 0.92);
  pen.rect(0, barV, barWidth, thickness);
}

/** Tools, crowns, flora, emblems and zodiac signs used by the card themes */
export const EMBLEM_GLYPHS: Readonly<Record<string, GlyphBuilder>> = {
  '⛰': (pen) => {
    pen.polygon([[-0.5, 0.38], [-0.2, -0.18], [-0.05, 0.02], [0.14, -0.4], [0.5, 0.38]]);
  },
  '⚒': (pen) => {
    hammer(pen.rotated(-Math.PI / 4));
    hammer(pen.rotated(Math.PI / 4));
  },
  '⚔': (pen) => {
    sword(pen.rotated(-Math.PI / 4));
    sword(pen.rotated(Math.PI / 4));
  },
  '⛏': (pen) => {
    const p = pen.rotated(Math.PI / 4);
    p.rect(0, 0.08, 0.09, 0.8);
    p.arcBand(0, 0.3, 0.62, 0.11, -122 * DEG, -58 * DEG);
  },
  '⚙': gear,
  '⚡': (pen) => pen.polygon([[0.14, -0.5], [0.3, -0.5], [0.08, -0.08], [0.3, -0.08], [-0.16, 0.5], [-0.04, 0.06], [-0.28, 0.06]]),
  '❅': snowflake,
  '✿': (pen) => flower(pen, 5, 0.2),
  '❀': (pen) => flower(pen, 5, 0.17),
  '❁': (pen) => flower(pen, 8, 0.18),
  '✾': (pen) => flower(pen, 6, 0.19),
  '⚘': (pen) => {
    pen.ellipse(0, -0.26, 0.12, 0.2);
    pen.ellipse(-0.14, -0.22, 0.1, 0.18, -0.4);
    pen.ellipse(0.14, -0.22, 0.1, 0.18, 0.4);
    pen.rect(0, 0.16, 0.06, 0.66);
    pen.ellipse(0.13, 0.2, 0.14, 0.06, -0.6);
  },
  '✝': (pen) => cross(pen, -0.16, 0.58, 0.14),
  '†': (pen) => cross(pen, -0.22, 0.46, 0.1),
  '♔': crown,
  '♛': crown,
  '☠': (pen) => {
    pen.circle(0, -0.1, 0.34);
    pen.rect(0, 0.3, 0.36, 0.2);
    pen.circle(-0.13, -0.08, 0.085, true);
    pen.circle(0.13, -0.08, 0.085, true);
    // Counter-clockwise: cut out of the skull like the eyes
    pen.polygon([[0, 0.04], [-0.05, 0.14], [0.05, 0.14]]);
  },
  '➹': (pen) => {
    const p = pen.rotated(Math.PI / 4);
    p.rect(0, 0.1, 0.08, 0.66);
    p.polygon([[0, -0.5], [0.2, -0.2], [-0.2, -0.2]]);
    p.polygon([[0.04, 0.3], [0.18, 0.44], [0.04, 0.44]]);
    p.polygon([[-0.04, 0.3], [-0.04, 0.44], [-0.18, 0.44]]);
  },
  '♈': (pen) => {
    pen.arcBand(-0.19, -0.12, 0.19, 0.08, 180 * DEG, 360 * DEG);
    pen.arcBand(0.19, -0.12, 0.19, 0.08, 180 * DEG, 360 * DEG);
    pen.rect(0, 0.17, 0.08, 0.58);
  },
  '♋': (pen) => {
    pen.circle(-0.24, -0.12, 0.1);
    pen.arcBand(0, -0.12, 0.24, 0.08, 180 * DEG, 360 * DEG);
    pen.circle(0.24, 0.12, 0.1);
    pen.arcBand(0, 0.12, 0.24, 0.08, 0, 180 * DEG);
  },
  '♌': (pen) => {
    pen.arcBand(-0.2, 0.18, 0.12, 0.08, 0, 360 * DEG);
    pen.arcBand(0.06, -0.1, 0.22, 0.08, 150 * DEG, 360 * DEG);
    pen.arcBand(0.16, 0.2, 0.12, 0.08, 180 * DEG, 0);
  },
  '♎': (pen) => {
    pen.rect(0, 0.32, 0.9, 0.08);
    pen.rect(-0.31, 0.1, 0.28, 0.08);
    pen.rect(0.31, 0.1, 0.28, 0.08);
    pen.arcBand(0, 0.1, 0.2, 0.08, 180 * DEG, 360 * DEG);
  },
};
