'use client';

import { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { ICard } from '@shared/domain';
import {
  buildCardMaterials,
  disposeCardMaterials,
  retainCardMaterials,
  type CardMaterial,
} from '@/presentation/utils/card-texture';
import type { CardRenderMode } from '@/presentation/utils/card-render-state';
import { setCardTextureMaxAnisotropy } from '@/presentation/utils/card-textures/card-texture-quality';
import { useCardThemeVersion } from './useCardTheme';

export interface UseCardMaterialsOptions {
  faceDown?: boolean;
  renderMode?: CardRenderMode;
}

/**
 * Identity of a card's materials: everything the textures are drawn from.
 *
 * Every GAME_STATE is parsed into fresh card objects, so memoising on the `card` object would
 * rebuild the materials of every mounted card on every game action (and render one frame with
 * unconfigured materials). A card's face is immutable per id; suit and value are included
 * because hidden placeholders (null suit/value) render face down.
 */
export function getCardMaterialsKey(card: ICard, faceDown: boolean, themeVersion: string): string {
  return [card.id, card.type, card.suit ?? '', card.value ?? '', faceDown ? 'down' : 'up', themeVersion].join('|');
}

/**
 * Materials for one card mesh (use with getCardGeometry()), rebuilt only when the card's
 * content, face-down state or the card theme changes. The face texture comes from the shared
 * face cache, so a card remounting at its next stage (hand -> played -> collecting) reuses it.
 */
export function useCardMaterials(card: ICard, options: UseCardMaterialsOptions = {}): CardMaterial[] {
  const { faceDown = false, renderMode = 'table' } = options;
  const themeVersion = useCardThemeVersion();
  const gl = useThree((state) => state.gl);
  // Before any face is created: anisotropy is applied when a texture first uploads.
  setCardTextureMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
  const key = getCardMaterialsKey(card, faceDown, themeVersion);
  // `key` covers card content, faceDown and the theme; the latest card object is equivalent.
  const materials = useMemo(() => buildCardMaterials(card, { faceDown, renderMode }), [key, renderMode]); // eslint-disable-line react-hooks/exhaustive-deps
  // Layout effect: the face is counted as used in the commit that attaches it.
  useLayoutEffect(() => {
    retainCardMaterials(materials);
    return () => disposeCardMaterials(materials);
  }, [materials]);
  return materials;
}
