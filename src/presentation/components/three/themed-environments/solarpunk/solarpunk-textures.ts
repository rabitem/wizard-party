import * as THREE from 'three';
import { SOLARPUNK_COLORS, SOLARPUNK_SKY } from '@/presentation/config/solarpunk-environment.config';
import { createPaintedTexture, fillVerticalGradient } from '../primitives/canvas-texture';
import { seededRandom } from '../primitives';

/** Canvas textures for the greenhouse: painted once, memoised and disposed by components. */

const SKY_SIZE = { WIDTH: 1024, HEIGHT: 512 } as const;
const HILL_LAYERS = 3;
const PANEL_CELLS = { COLS: 6, ROWS: 4 } as const;

/** Sky dome: blue zenith, hazy horizon, rolling meadow hills and a soft sun. */
export function createSkyTexture(): THREE.Texture {
  return createPaintedTexture(SKY_SIZE.WIDTH, SKY_SIZE.HEIGHT, (ctx, w, h) => {
    fillVerticalGradient(ctx, w, h, SOLARPUNK_SKY.stops);
    const rand = seededRandom(404);
    const horizon = h * 0.51;

    // Soft sun glow up-left
    const sun = ctx.createRadialGradient(w * 0.3, h * 0.16, 0, w * 0.3, h * 0.16, h * 0.32);
    sun.addColorStop(0, SOLARPUNK_SKY.sun);
    sun.addColorStop(0.18, 'rgba(255,250,220,0.8)');
    sun.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h * 0.6);

    // Fair-weather clouds
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 9; i++) {
      const cx = rand() * w;
      const cy = h * (0.12 + rand() * 0.24);
      for (let p = 0; p < 4; p++) {
        ctx.beginPath();
        ctx.ellipse(cx + p * 26 - 40, cy + (p % 2) * 6, 34 + rand() * 18, 12 + rand() * 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Layered hills; the texture wraps around the dome so keep them periodic.
    for (let layer = 0; layer < HILL_LAYERS; layer++) {
      ctx.fillStyle = SOLARPUNK_SKY.hills[layer];
      ctx.beginPath();
      ctx.moveTo(0, h);
      const amp = 14 + layer * 6;
      const base = horizon + layer * 14;
      const freq = 2 + layer;
      for (let x = 0; x <= w; x += 8) {
        const t = (x / w) * Math.PI * 2;
        ctx.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin(t * freq + layer)) - 6 * Math.sin(t * freq * 3));
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }

    // Distant tree dots along the far ridge
    ctx.fillStyle = '#4e8a3c';
    for (let i = 0; i < 40; i++) {
      const x = rand() * w;
      ctx.beginPath();
      ctx.arc(x, horizon - 4 + rand() * 10, 4 + rand() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Photovoltaic panel: blue cells in a silver grid with a faint diagonal sheen. */
export function createPanelTexture(): THREE.Texture {
  return createPaintedTexture(192, 128, (ctx, w, h) => {
    ctx.fillStyle = SOLARPUNK_COLORS.panelFrame;
    ctx.fillRect(0, 0, w, h);
    const pad = 6;
    const cw = (w - pad * 2) / PANEL_CELLS.COLS;
    const ch = (h - pad * 2) / PANEL_CELLS.ROWS;
    for (let r = 0; r < PANEL_CELLS.ROWS; r++) {
      for (let c = 0; c < PANEL_CELLS.COLS; c++) {
        const cell = ctx.createLinearGradient(0, pad + r * ch, 0, pad + (r + 1) * ch);
        cell.addColorStop(0, '#2c5a9a');
        cell.addColorStop(1, SOLARPUNK_COLORS.panel);
        ctx.fillStyle = cell;
        ctx.fillRect(pad + c * cw + 1.5, pad + r * ch + 1.5, cw - 3, ch - 3);
      }
    }
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0.3, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    sheen.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
  });
}
