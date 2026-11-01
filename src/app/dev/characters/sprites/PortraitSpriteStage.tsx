'use client';

import { useEffect, useRef } from 'react';
import { UserRound } from 'lucide-react';
import { portraitSprites, SILHOUETTE_SPRITE_FILE, type CharacterAppearance, type PortraitSprite } from '@shared/domain/character';

// By path: the character barrel also exports the 3D figure, which this page never shows.
import { renderCharacterPortrait } from '@/presentation/components/character/character-portrait-renderer';

/** The silhouette as CharacterFace draws it: the icon at 60% of the box, amber-200 at 45%. */
const SILHOUETTE = { COLOR: 'rgba(253, 230, 138, 0.45)', SCALE: 0.6 } as const;

/** What the sprite script calls on this page (page.evaluate). Sprites come back as PNG data URLs. */
interface PortraitSpriteApi {
  sprites: PortraitSprite[];
  silhouetteFile: string;
  render: (appearance: CharacterAppearance, size: number) => Promise<string>;
  silhouette: (size: number) => Promise<string>;
}

declare global {
  interface Window {
    __portraitSprites?: PortraitSpriteApi;
  }
}

/** Draws an image source into a square PNG of `size`, scaled to `scale` of it and centred. */
async function toPng(src: string, size: number, scale = 1): Promise<string> {
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no 2d context');
  context.imageSmoothingQuality = 'high';
  const drawn = size * scale;
  context.drawImage(image, (size - drawn) / 2, (size - drawn) / 2, drawn, drawn);
  return canvas.toDataURL('image/png');
}

/** Dev page for scripts/characters/render-portrait-sprites.mjs: the browser portrait renderer, exposed. */
export function PortraitSpriteStage() {
  const silhouetteRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    window.__portraitSprites = {
      sprites: portraitSprites(),
      silhouetteFile: SILHOUETTE_SPRITE_FILE,
      render: async (appearance, size) => toPng(await renderCharacterPortrait(appearance), size),
      silhouette: (size) => {
        const svg = silhouetteRef.current?.querySelector('svg');
        if (!svg) return Promise.reject(new Error('no silhouette icon'));
        const markup = new XMLSerializer().serializeToString(svg);
        return toPng(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`, size, SILHOUETTE.SCALE);
      },
    };
    return () => {
      delete window.__portraitSprites;
    };
  }, []);

  return (
    <main className="p-6 text-amber-100">
      <p>Portrait sprites: driven by scripts/characters/render-portrait-sprites.mjs.</p>
      <span ref={silhouetteRef} hidden>
        <UserRound color={SILHOUETTE.COLOR} width={256} height={256} aria-hidden />
      </span>
    </main>
  );
}
