/**
 * Draws glyph outlines in a unit "em" box (x right, y down, centred on 0, about -0.5..0.5) onto
 * a 2D context (or another path sink) at a position and size, without touching the context
 * transform: gradients and shadows the caller set up in canvas space keep working exactly as they
 * do for fillText.
 *
 * Winding convention (nonzero fill): solid shapes run clockwise on screen, holes counter-
 * clockwise. Arcs are emitted as short line segments so mirrored/rotated pens stay exact.
 */

export type GlyphPoint = readonly [number, number];

/** The path calls a pen makes: a canvas context, or a 3D shape path for the table emblem */
export type GlyphPathSink = Pick<CanvasRenderingContext2D, 'moveTo' | 'lineTo' | 'bezierCurveTo' | 'closePath'>;

/** Segments of a full circle; far below a pixel of error at card-face glyph sizes */
const CIRCLE_SEGMENTS = 40;
const TAU = Math.PI * 2;

export class GlyphPen {
  private readonly cos: number;
  private readonly sin: number;

  constructor(
    private readonly ctx: GlyphPathSink,
    private readonly x: number,
    private readonly y: number,
    private readonly size: number,
    private readonly rotation = 0,
    private readonly offset: GlyphPoint = [0, 0]
  ) {
    this.cos = Math.cos(rotation);
    this.sin = Math.sin(rotation);
  }

  /** A pen whose local drawing is rotated by `angle` around (du, dv) of this pen */
  rotated(angle: number, du = 0, dv = 0): GlyphPen {
    const [ox, oy] = this.local(du, dv);
    return new GlyphPen(this.ctx, this.x, this.y, this.size, this.rotation + angle, [ox, oy]);
  }

  moveTo(u: number, v: number): void {
    const [px, py] = this.map(u, v);
    this.ctx.moveTo(px, py);
  }

  lineTo(u: number, v: number): void {
    const [px, py] = this.map(u, v);
    this.ctx.lineTo(px, py);
  }

  curveTo(c1u: number, c1v: number, c2u: number, c2v: number, u: number, v: number): void {
    const [a, b] = this.map(c1u, c1v);
    const [c, d] = this.map(c2u, c2v);
    const [e, f] = this.map(u, v);
    this.ctx.bezierCurveTo(a, b, c, d, e, f);
  }

  close(): void {
    this.ctx.closePath();
  }

  polygon(points: readonly GlyphPoint[]): void {
    points.forEach(([u, v], i) => (i === 0 ? this.moveTo(u, v) : this.lineTo(u, v)));
    this.close();
  }

  /** Arc as a polyline; `connect` continues the current subpath instead of starting one */
  arc(cu: number, cv: number, r: number, from: number, to: number, connect = false): void {
    const steps = Math.max(2, Math.ceil((Math.abs(to - from) / TAU) * CIRCLE_SEGMENTS));
    for (let i = 0; i <= steps; i++) {
      const a = from + ((to - from) * i) / steps;
      const u = cu + Math.cos(a) * r;
      const v = cv + Math.sin(a) * r;
      if (i === 0 && !connect) this.moveTo(u, v);
      else this.lineTo(u, v);
    }
  }

  /** Full circle; `hole` winds it counter-clockwise to cut it out of shapes around it */
  circle(cu: number, cv: number, r: number, hole = false): void {
    this.arc(cu, cv, r, hole ? TAU : 0, hole ? 0 : TAU);
    this.close();
  }

  ellipse(cu: number, cv: number, rx: number, ry: number, angle = 0): void {
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const a = (TAU * i) / CIRCLE_SEGMENTS;
      const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      const u = cu + ex * c - ey * s;
      const v = cv + ex * s + ey * c;
      if (i === 0) this.moveTo(u, v);
      else this.lineTo(u, v);
    }
    this.close();
  }

  /** Rectangle of size w x h centred on (cu, cv), rotated around its centre */
  rect(cu: number, cv: number, w: number, h: number, angle = 0): void {
    const c = Math.cos(angle), s = Math.sin(angle);
    const corners: GlyphPoint[] = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    this.polygon(corners.map(([u, v]) => [cu + u * c - v * s, cv + u * s + v * c] as const));
  }

  /** Thick arc stroke as a closed band (clockwise when from < to) */
  arcBand(cu: number, cv: number, r: number, thickness: number, from: number, to: number): void {
    this.arc(cu, cv, r + thickness / 2, from, to);
    this.arc(cu, cv, r - thickness / 2, to, from, true);
    this.close();
  }

  /** Thick sine wave band from x0 to x1 */
  waveBand(params: { v: number; amplitude: number; thickness: number; x0: number; x1: number; waves: number }): void {
    const { v, amplitude, thickness, x0, x1, waves } = params;
    const steps = 24;
    const at = (i: number) => x0 + ((x1 - x0) * i) / steps;
    const wave = (u: number) => v + Math.sin(((u - x0) / (x1 - x0)) * waves * TAU) * amplitude;
    for (let i = 0; i <= steps; i++) {
      const u = at(i);
      if (i === 0) this.moveTo(u, wave(u) - thickness / 2);
      else this.lineTo(u, wave(u) - thickness / 2);
    }
    for (let i = steps; i >= 0; i--) this.lineTo(at(i), wave(at(i)) + thickness / 2);
    this.close();
  }

  private local(u: number, v: number): GlyphPoint {
    return [this.offset[0] + u * this.cos - v * this.sin, this.offset[1] + u * this.sin + v * this.cos];
  }

  private map(u: number, v: number): GlyphPoint {
    const [lu, lv] = this.local(u, v);
    return [this.x + lu * this.size, this.y + lv * this.size];
  }
}

/** Points of an n-pointed star (clockwise), first point straight up */
export function starPoints(points: number, outer: number, inner: number, rotation = -Math.PI / 2): GlyphPoint[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotation + (Math.PI * i) / points;
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  });
}
