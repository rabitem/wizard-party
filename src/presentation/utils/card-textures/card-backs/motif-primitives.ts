'use client';

/**
 * Small seasonal motifs (bats, pumpkins, leaves, snowflakes, flowers, suns...)
 * shared by the themed card backs and the seasonal card front ornaments.
 * Every motif is drawn around (x, y) and scales with its size argument.
 */

const TAU = Math.PI * 2;

export interface Point {
  x: number;
  y: number;
}

export interface PumpkinColors {
  body: string;
  rib: string;
  stem: string;
  /** Glowing jack-o'-lantern face; omitted means a plain pumpkin */
  face?: string;
}

export function drawBat(ctx: CanvasRenderingContext2D, { x, y }: Point, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.15);
  for (const dir of [1, -1]) {
    ctx.quadraticCurveTo(x + dir * s * 0.35, y - s * 0.55, x + dir * s, y - s * 0.25);
    ctx.quadraticCurveTo(x + dir * s * 0.8, y - s * 0.05, x + dir * s * 0.75, y + s * 0.15);
    ctx.quadraticCurveTo(x + dir * s * 0.6, y, x + dir * s * 0.5, y + s * 0.2);
    ctx.quadraticCurveTo(x + dir * s * 0.35, y + s * 0.02, x + dir * s * 0.2, y + s * 0.25);
    ctx.quadraticCurveTo(x + dir * s * 0.1, y + s * 0.1, x, y + s * 0.3);
    if (dir === 1) ctx.moveTo(x, y - s * 0.15);
  }
  ctx.closePath();
  ctx.fill();
  // Head with ears
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, y - s * 0.12);
  ctx.lineTo(x - s * 0.1, y - s * 0.32);
  ctx.lineTo(x, y - s * 0.18);
  ctx.lineTo(x + s * 0.1, y - s * 0.32);
  ctx.lineTo(x + s * 0.12, y - s * 0.12);
  ctx.arc(x, y - s * 0.08, s * 0.12, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
}

export function drawPumpkin(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, colors: PumpkinColors): void {
  // Stem first so the body overlaps its base
  ctx.fillStyle = colors.stem;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.12, y - r * 0.62);
  ctx.lineTo(x - r * 0.06, y - r * 1.02);
  ctx.lineTo(x + r * 0.2, y - r * 1.1);
  ctx.lineTo(x + r * 0.12, y - r * 0.62);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = colors.body;
  for (const [dx, sx] of [[-0.42, 0.56], [0.42, 0.56], [0, 0.64]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * r, y, sx * r, r * 0.8, 0, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = colors.rib;
  ctx.lineWidth = Math.max(1, r * 0.06);
  for (const dx of [-0.28, 0.28]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * r, y, r * 0.26, r * 0.76, 0, 0, TAU);
    ctx.stroke();
  }

  if (!colors.face) return;
  ctx.fillStyle = colors.face;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + dir * r * 0.36, y - r * 0.08);
    ctx.lineTo(x + dir * r * 0.14, y - r * 0.08);
    ctx.lineTo(x + dir * r * 0.25, y - r * 0.32);
    ctx.closePath();
    ctx.fill();
  }
  // Zig-zag grin
  ctx.beginPath();
  ctx.moveTo(x - r * 0.42, y + r * 0.12);
  const teeth = 6;
  for (let i = 1; i <= teeth; i++) {
    const tx = x - r * 0.42 + (i * r * 0.84) / teeth;
    ctx.lineTo(tx, y + r * (i % 2 === 0 ? 0.12 : 0.24));
  }
  ctx.quadraticCurveTo(x, y + r * 0.6, x - r * 0.42, y + r * 0.12);
  ctx.closePath();
  ctx.fill();
}

/** Full moon with a soft halo and a few craters */
export function drawMoon(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, color: string, crater: string): void {
  const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.4);
  halo.addColorStop(0, 'rgba(255,248,220,0.35)');
  halo.addColorStop(1, 'rgba(255,248,220,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();

  ctx.fillStyle = crater;
  ctx.globalAlpha = 0.18;
  for (const [cx, cy, cr] of [[-0.35, -0.2, 0.22], [0.3, 0.25, 0.16], [0.1, -0.45, 0.1], [-0.15, 0.45, 0.12]]) {
    ctx.beginPath();
    ctx.arc(x + cx * r, y + cy * r, cr * r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Simple pointed leaf with a centre vein */
export function drawLeaf(
  ctx: CanvasRenderingContext2D,
  { x, y }: Point,
  size: number,
  angle: number,
  { color, vein }: { color: string; vein?: string }
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.75, -size * 0.25, 0, size * 0.75);
  ctx.quadraticCurveTo(-size * 0.75, -size * 0.25, 0, -size);
  ctx.fill();
  if (vein) {
    ctx.strokeStyle = vein;
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.8);
    ctx.lineTo(0, size);
    ctx.stroke();
  }
  ctx.restore();
}

/** Five-lobed maple leaf with a stem */
export function drawMapleLeaf(ctx: CanvasRenderingContext2D, { x, y }: Point, size: number, angle: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  const lobes = 5;
  for (let i = 0; i <= lobes * 2; i++) {
    // Lobes fan over the upper 300 degrees; the gap at the bottom holds the stem
    const a = -Math.PI / 2 + ((i / (lobes * 2)) - 0.5) * (Math.PI * 1.65);
    const r = i % 2 === 0 ? size : size * 0.45;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.lineTo(0, size * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.1);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.1);
  ctx.lineTo(0, size * 0.75);
  ctx.stroke();
  ctx.restore();
}

export function drawAcorn(ctx: CanvasRenderingContext2D, { x, y }: Point, size: number, nut: string, cap: string): void {
  ctx.fillStyle = nut;
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.2, size * 0.42, size * 0.55, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.ellipse(x, y - size * 0.12, size * 0.52, size * 0.3, 0, Math.PI, TAU);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - size * 0.52, y - size * 0.14, size * 1.04, size * 0.1);
  ctx.strokeStyle = cap;
  ctx.lineWidth = Math.max(1, size * 0.1);
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.4);
  ctx.lineTo(x + size * 0.12, y - size * 0.62);
  ctx.stroke();
}

/** Six-armed snowflake with two pairs of side branches per arm */
export function drawSnowflake(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    ctx.moveTo(x, y);
    ctx.lineTo(x + cos * r, y + sin * r);
    for (const t of [0.45, 0.72]) {
      const bx = x + cos * r * t;
      const by = y + sin * r * t;
      const len = r * (t === 0.45 ? 0.32 : 0.22);
      for (const side of [-1, 1]) {
        const ba = a + side * (Math.PI / 4);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ba) * len, by + Math.sin(ba) * len);
      }
    }
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
}

export function drawFlower(
  ctx: CanvasRenderingContext2D,
  { x, y }: Point,
  r: number,
  petals: number,
  colors: { petal: string; center: string }
): void {
  ctx.fillStyle = colors.petal;
  for (let i = 0; i < petals; i++) {
    const a = (i * TAU) / petals;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.26, a, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = colors.center;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.26, 0, TAU);
  ctx.fill();
}

/** Single falling blossom petal */
export function drawPetal(ctx: CanvasRenderingContext2D, { x, y }: Point, size: number, angle: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, size, size * 0.55, angle, 0, TAU);
  ctx.fill();
}

/** Sun disc with alternating long and short triangular rays */
export function drawSun(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, rays: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < rays; i++) {
    const a = (i * TAU) / rays;
    const half = Math.PI / rays * 0.55;
    const len = i % 2 === 0 ? r * 1.7 : r * 1.4;
    ctx.moveTo(x + Math.cos(a - half) * r * 1.05, y + Math.sin(a - half) * r * 1.05);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.lineTo(x + Math.cos(a + half) * r * 1.05, y + Math.sin(a + half) * r * 1.05);
  }
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** One row of rolling wave crests from x0 to x1 */
export function drawWaveRow(
  ctx: CanvasRenderingContext2D,
  { y, x0, x1 }: { y: number; x0: number; x1: number },
  wavelength: number,
  amplitude: number
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y);
  for (let x = x0; x < x1; x += wavelength) {
    ctx.quadraticCurveTo(x + wavelength * 0.25, y - amplitude, x + wavelength * 0.5, y);
    ctx.quadraticCurveTo(x + wavelength * 0.75, y + amplitude, x + wavelength, y);
  }
  ctx.stroke();
}

/** Spider web filling a corner; dirX/dirY point from the corner into the card */
export function drawCornerWeb(ctx: CanvasRenderingContext2D, corner: Point, size: number, dirX: 1 | -1, dirY: 1 | -1): void {
  const spokes = 5;
  ctx.beginPath();
  for (let i = 0; i < spokes; i++) {
    const a = (i / (spokes - 1)) * (Math.PI / 2);
    ctx.moveTo(corner.x, corner.y);
    ctx.lineTo(corner.x + dirX * Math.cos(a) * size, corner.y + dirY * Math.sin(a) * size);
  }
  for (const ring of [0.35, 0.62, 0.9]) {
    for (let i = 0; i < spokes; i++) {
      const a = (i / (spokes - 1)) * (Math.PI / 2);
      const px = corner.x + dirX * Math.cos(a) * size * ring;
      const py = corner.y + dirY * Math.sin(a) * size * ring;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
}
