import { addSoftStops, createSpriteCanvas, rgba, shade, type Rgb, type SpriteImage } from './canvas';

/** Sharp flakes keep this much of their radius fully opaque; blur eats into it. */
const SHARP_CORE = 0.85;
/** Streak sprites are this many times longer than thick. */
const STREAK_ASPECT = 16;
/** Thickness share of the bright streak core. */
const STREAK_CORE = 0.4;

const square = (canvas: HTMLCanvasElement): SpriteImage => ({ image: canvas, w: 1, h: 1 });

/** Snowflake: a disc whose edge softens with blur (0 = crisp far flake, 1 = out-of-focus). */
export function drawFlake(rgb: Rgb, res: number, blur: number): SpriteImage {
  const { canvas, ctx } = createSpriteCanvas(res, res);
  const r = res / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  addSoftStops(gradient, rgb, SHARP_CORE * (1 - blur), 1, blur > 0.5 ? 8 : 4);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, res, res);
  return square(canvas);
}

/** Lens bokeh: translucent disc with a brighter rim, like an out-of-focus highlight. */
export function drawBokeh(rgb: Rgb, res: number): SpriteImage {
  const { canvas, ctx } = createSpriteCanvas(res, res);
  const r = res / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  const light = shade(rgb, 0.3);
  gradient.addColorStop(0, rgba(light, 0.38));
  gradient.addColorStop(0.6, rgba(rgb, 0.42));
  gradient.addColorStop(0.86, rgba(light, 0.78));
  gradient.addColorStop(0.94, rgba(rgb, 0.4));
  gradient.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, res, res);
  return square(canvas);
}

/** Glowing mote / ember / spark: white-hot core inside a colored halo. */
export function drawGlow(rgb: Rgb, res: number, blur: number): SpriteImage {
  const { canvas, ctx } = createSpriteCanvas(res, res);
  const r = res / 2;
  const core = 0.16 * (1 - blur * 0.5);
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, rgba(shade(rgb, 0.65), 1));
  gradient.addColorStop(core, rgba(rgb, 0.9));
  gradient.addColorStop(core * 2.4, rgba(rgb, 0.32));
  gradient.addColorStop(0.7, rgba(rgb, 0.08));
  gradient.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, res, res);
  return square(canvas);
}

/** Star: small glow with thin four-point diffraction spikes. */
export function drawStar(rgb: Rgb, res: number): SpriteImage {
  const sprite = drawGlow(rgb, res, 0.6);
  const ctx = sprite.image.getContext('2d');
  if (!ctx) return sprite;
  const r = res / 2;
  const thickness = Math.max(1, res / 28);
  ctx.globalCompositeOperation = 'lighter';
  const horizontal = ctx.createLinearGradient(0, 0, res, 0);
  horizontal.addColorStop(0, rgba(rgb, 0));
  horizontal.addColorStop(0.5, rgba(shade(rgb, 0.5), 0.85));
  horizontal.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, r - thickness / 2, res, thickness);
  const vertical = ctx.createLinearGradient(0, 0, 0, res);
  vertical.addColorStop(0, rgba(rgb, 0));
  vertical.addColorStop(0.5, rgba(shade(rgb, 0.5), 0.85));
  vertical.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = vertical;
  ctx.fillRect(r - thickness / 2, 0, thickness, res);
  return sprite;
}

/** 3x3 pixel-art star (a plus); drawn with nearest-neighbour scaling. */
export function drawPixel(rgb: Rgb): SpriteImage {
  const { canvas, ctx } = createSpriteCanvas(3, 3);
  ctx.fillStyle = rgba(rgb, 0.55);
  ctx.fillRect(1, 0, 1, 3);
  ctx.fillRect(0, 1, 3, 1);
  ctx.fillStyle = rgba(shade(rgb, 0.4), 1);
  ctx.fillRect(1, 1, 1, 1);
  return square(canvas);
}

/** Streak (rain, shooting star, ink line): a tapered line with its bright head at +x. */
export function drawStreak(rgb: Rgb, res: number): SpriteImage {
  const width = res;
  const height = Math.max(2, Math.round(res / STREAK_ASPECT));
  const { canvas, ctx } = createSpriteCanvas(width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, rgba(rgb, 0));
  gradient.addColorStop(0.7, rgba(rgb, 0.45));
  gradient.addColorStop(0.95, rgba(shade(rgb, 0.6), 1));
  gradient.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  const core = Math.max(1, Math.round(height * STREAK_CORE));
  ctx.fillRect(0, (height - core) / 2, width, core);
  return { image: canvas, w: 1, h: height / width };
}
