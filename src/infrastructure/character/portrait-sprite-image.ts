import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PORTRAIT_SPRITE_DIR, portraitSpriteFile, type CharacterAppearance } from '@shared/domain/character';

/*
 * Character portraits for images rendered on the server with next/og (social email cards, link
 * previews). The sprites are committed PNGs in public/ (scripts/characters/render-portrait-sprites.mjs);
 * they are read from disk, never fetched, so a render needs no network and works on previews.
 * Routes that render them list public/characters/portraits in next.config.ts
 * (outputFileTracingIncludes), or the files are missing from the serverless bundle.
 */

const SPRITE_ROOT = join(process.cwd(), 'public', ...PORTRAIT_SPRITE_DIR.split('/').filter(Boolean));

const sprites = new Map<string, Promise<string>>();

/**
 * The look's portrait as a PNG data URL for an `<img>` in next/og; null (no known look) is the
 * silhouette. File names only ever come from catalog part ids (portraitSpriteFile).
 */
export function portraitSpriteDataUrl(appearance: CharacterAppearance | null): Promise<string> {
  const file = portraitSpriteFile(appearance);
  let sprite = sprites.get(file);
  if (!sprite) {
    sprite = readFile(join(SPRITE_ROOT, file)).then((bytes) => `data:image/png;base64,${bytes.toString('base64')}`);
    sprite.catch(() => sprites.delete(file));
    sprites.set(file, sprite);
  }
  return sprite;
}
