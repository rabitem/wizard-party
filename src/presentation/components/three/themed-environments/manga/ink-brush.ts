/**
 * Tiny procedural sumi brush for the dojo canvas textures: tapered strokes,
 * abstract calligraphy glyphs, an enso circle and a red hanko seal. Strokes
 * fill with the context's current fillStyle.
 */

type Point = [number, number];
type Taper = 'both' | 'end';

const SAMPLES_PER_SEGMENT = 24;

function pressure(t: number, taper: Taper): number {
  if (taper === 'end') return 1 - t * 0.85;
  return Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.08)), 0.5);
}

/** Tapered brush stroke through the points (stamped discs along the path). */
export function brushStroke(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  width: number,
  rand: () => number,
  taper: Taper = 'both',
): void {
  const segments = points.length - 1;
  if (segments < 1) return;
  const total = segments * SAMPLES_PER_SEGMENT;
  for (let i = 0; i <= total; i++) {
    const t = i / total;
    const segment = Math.min(segments - 1, Math.floor(t * segments));
    const local = t * segments - segment;
    const [ax, ay] = points[segment];
    const [bx, by] = points[segment + 1];
    const radius = (width / 2) * pressure(t, taper) * (0.9 + rand() * 0.2);
    ctx.beginPath();
    ctx.arc(ax + (bx - ax) * local, ay + (by - ay) * local, Math.max(0.4, radius), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Abstract calligraphy character: 3-5 strokes inside a size x size cell. */
export function drawInkGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, rand: () => number): void {
  const half = size / 2;
  const width = Math.max(2, size * 0.16);
  const strokes = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < strokes; i++) {
    const kind = Math.floor(rand() * 5);
    const ox = cx + (rand() - 0.5) * half * 0.6;
    const oy = cy + (rand() - 0.5) * half * 0.8;
    if (kind === 0) brushStroke(ctx, [[cx - half, oy], [cx + half * 0.9, oy - half * 0.08]], width, rand);
    else if (kind === 1) brushStroke(ctx, [[ox, cy - half], [ox + half * 0.05, cy + half]], width, rand);
    else if (kind === 2) brushStroke(ctx, [[ox, oy - half * 0.5], [ox - half * 0.4, oy + half * 0.2], [ox - half * 0.9, oy + half * 0.7]], width, rand, 'end');
    else if (kind === 3) brushStroke(ctx, [[ox - half * 0.2, oy - half * 0.2], [ox + half * 0.4, oy + half * 0.4], [ox + half, oy + half * 0.6]], width, rand);
    else brushStroke(ctx, [[ox, oy], [ox + width * 0.6, oy + width * 0.8]], width * 1.2, rand, 'end');
  }
}

/** Open zen circle painted in one sweep, thick at the start and dry at the end. */
export function drawEnso(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, rand: () => number): void {
  const start = -Math.PI * 0.4;
  const sweep = Math.PI * 1.82;
  const steps = 14;
  const points: Point[] = Array.from({ length: steps + 1 }, (_, i) => {
    const angle = start + (i / steps) * sweep;
    const wobble = 1 + (rand() - 0.5) * 0.04;
    return [cx + Math.cos(angle) * radius * wobble, cy + Math.sin(angle) * radius * wobble];
  });
  brushStroke(ctx, points, radius * 0.28, rand, 'end');
}

/** Square red seal with a carved paper-white mark. */
export function drawHanko(ctx: CanvasRenderingContext2D, cx: number, cy: number, half: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
  ctx.fillStyle = 'rgba(244,239,226,0.9)';
  ctx.fillRect(cx - half * 0.55, cy - half * 0.5, half * 1.1, half * 0.22);
  ctx.fillRect(cx - half * 0.11, cy - half * 0.5, half * 0.22, half * 1.1);
  ctx.fillRect(cx - half * 0.55, cy + half * 0.3, half * 1.1, half * 0.2);
  ctx.restore();
}
