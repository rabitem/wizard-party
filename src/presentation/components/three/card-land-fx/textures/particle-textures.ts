/**
 * Canvas painters for the white, tintable particle sprites. Every painter
 * draws white-on-transparent so one texture serves any colour via the
 * per-particle colour attribute.
 */

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Soft radial blob: dust, fog, snow powder, pollen, droplets, flashes. */
export const paintSoftDot: Painter = (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

/** Bright core with a four-point glint: embers, glitter, stardust, light flecks. */
export const paintSpark: Painter = (ctx, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx + w * 0.05, cy);
  ctx.lineTo(cx, h);
  ctx.lineTo(cx - w * 0.05, cy);
  ctx.closePath();
  ctx.moveTo(0, cy);
  ctx.lineTo(cx, cy - h * 0.05);
  ctx.lineTo(w, cy);
  ctx.lineTo(cx, cy + h * 0.05);
  ctx.closePath();
  ctx.fill();
};

/** Pointed leaf with a darker midrib and stem. */
export const paintLeaf: Painter = (ctx, w, h) => {
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 4);
  const len = w * 0.42;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -len);
  ctx.bezierCurveTo(len * 0.75, -len * 0.45, len * 0.6, len * 0.55, 0, len * 0.8);
  ctx.bezierCurveTo(-len * 0.6, len * 0.55, -len * 0.75, -len * 0.45, 0, -len);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,150,150,0.9)';
  ctx.lineWidth = w * 0.035;
  ctx.beginPath();
  ctx.moveTo(0, -len * 0.85);
  ctx.lineTo(0, len);
  ctx.stroke();
  ctx.lineWidth = w * 0.02;
  for (let i = -2; i <= 2; i++) {
    const y = i * len * 0.25;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(len * 0.38, y - len * 0.22);
    ctx.moveTo(0, y);
    ctx.lineTo(-len * 0.38, y - len * 0.22);
    ctx.stroke();
  }
};

/** Rounded petal with a notch and soft blush at the base. */
export const paintPetal: Painter = (ctx, w, h) => {
  const cx = w / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, h * 0.92);
  ctx.bezierCurveTo(w * 0.05, h * 0.6, w * 0.15, h * 0.08, cx - w * 0.08, h * 0.12);
  ctx.lineTo(cx, h * 0.2);
  ctx.lineTo(cx + w * 0.08, h * 0.12);
  ctx.bezierCurveTo(w * 0.85, h * 0.08, w * 0.95, h * 0.6, cx, h * 0.92);
  ctx.fill();
  const g = ctx.createRadialGradient(cx, h * 0.9, 0, cx, h * 0.9, h * 0.45);
  g.addColorStop(0, 'rgba(200,200,200,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
};

/** Chunky pixel with a light top-left bevel and darker bottom-right. */
export const paintSquare: Painter = (ctx, w, h) => {
  const b = Math.round(w * 0.16);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(160,160,160,1)';
  ctx.fillRect(b, h - b, w - b, b);
  ctx.fillRect(w - b, b, b, h - b);
  ctx.fillStyle = 'rgba(210,210,210,1)';
  ctx.fillRect(b, b, w - 2 * b, h - 2 * b);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(b, b, Math.round(w * 0.25), Math.round(h * 0.25));
};

/** Six-armed ice crystal. */
export const paintCrystal: Painter = (ctx, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = w * 0.44;
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = w * 0.08;
  for (let arm = 0; arm < 6; arm++) {
    const a = (arm / 6) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    ctx.lineWidth = w * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx * r, cy + dy * r);
    ctx.stroke();
    ctx.lineWidth = w * 0.035;
    const bx = cx + dx * r * 0.55;
    const by = cy + dy * r * 0.55;
    for (const side of [-1, 1]) {
      const ba = a + side * 0.7;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ba) * r * 0.3, by + Math.sin(ba) * r * 0.3);
      ctx.stroke();
    }
  }
};
