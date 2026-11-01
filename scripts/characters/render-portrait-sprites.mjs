#!/usr/bin/env node
/**
 * Renders the character portrait sprites that server-drawn images use (social emails, link
 * previews) into public/characters/portraits. The renders come from the browser portrait renderer
 * on the real assets: headless Chromium (WebGL through SwiftShader) opens the dev-only page
 * /dev/characters/sprites, which lists every sprite (`portraitSprites()` in
 * shared/domain/character/portrait-sprites.ts) and renders each one. Start the app first.
 *
 *   npm run dev                       # in another terminal
 *   npm run characters:sprites
 *   npm run characters:sprites -- --url http://localhost:3300
 *
 * Options
 *   --url <base>   App origin (default http://localhost:3000)
 *   --size <px>    Sprite edge in pixels (default 192: sharp at twice the size emails show)
 *   --headed       Show the browser
 *
 * Every PNG is quantized to a 256-colour palette. The directory is emptied first, so retired
 * sprites disappear; commit what it writes.
 */
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'public', 'characters', 'portraits');
const PAGE_PATH = '/dev/characters/sprites';
const PAGE_TIMEOUT_MS = 180_000;
/** libimagequant through sharp: a palette PNG at this quality is visually lossless at sprite size. */
const PNG_OPTIONS = { palette: true, quality: 90, effort: 10, compressionLevel: 9 };

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:3000' },
    size: { type: 'string', default: '192' },
    headed: { type: 'boolean', default: false },
  },
});
const size = Number(values.size);
if (!Number.isInteger(size) || size < 16 || size > 512) throw new Error(`--size must be an integer from 16 to 512, got ${values.size}`);

async function writeSprite(file, dataUrl) {
  const raw = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  await writeFile(path.join(OUT_DIR, file), await sharp(raw).png(PNG_OPTIONS).toBuffer());
}

async function main() {
  const browser = await chromium.launch({ headless: !values.headed, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error('[page]', error.message));
    await page.goto(new URL(PAGE_PATH, values.url).href, { timeout: PAGE_TIMEOUT_MS });
    await page.waitForFunction(() => Boolean(window.__portraitSprites), undefined, { timeout: PAGE_TIMEOUT_MS });
    const { sprites, silhouetteFile } = await page.evaluate(() => ({
      sprites: window.__portraitSprites.sprites,
      silhouetteFile: window.__portraitSprites.silhouetteFile,
    }));

    await rm(OUT_DIR, { recursive: true, force: true });
    await mkdir(OUT_DIR, { recursive: true });
    await writeSprite(silhouetteFile, await page.evaluate((edge) => window.__portraitSprites.silhouette(edge), size));
    // One at a time: the page renders every portrait on one shared WebGL stage anyway.
    for (const [index, sprite] of sprites.entries()) {
      // eslint-disable-next-line no-await-in-loop
      const dataUrl = await page.evaluate(([appearance, edge]) => window.__portraitSprites.render(appearance, edge), [sprite.appearance, size]);
      // eslint-disable-next-line no-await-in-loop
      await writeSprite(sprite.file, dataUrl);
      process.stdout.write(`\r${index + 1}/${sprites.length} ${sprite.file.padEnd(48)}`);
    }
    const files = await readdir(OUT_DIR);
    const total = (await Promise.all(files.map((file) => stat(path.join(OUT_DIR, file))))).reduce((sum, entry) => sum + entry.size, 0);
    process.stdout.write(`\nWrote ${files.length} sprites (${size}px), ${(total / 1024).toFixed(0)} KB, to ${path.relative(process.cwd(), OUT_DIR)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
