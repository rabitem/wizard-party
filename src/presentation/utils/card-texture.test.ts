import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as THREE from 'three';
import { CardType, Suit, type ICard } from '@shared/domain';
import { CARD_BACK_DESIGNS, DEFAULT_CARD_BACK } from '@/presentation/components/settings/card-back-presets';
import { CARD_FACE_LOGICAL_SIZE, CARD_TEXTURE_QUALITY, CARD_TEXTURE_TIERS } from '@/presentation/config/card-render.config';
import { CARD_MATERIAL_SLOT } from './card-geometry';
// Warm the module graph at collection time: every test re-imports it after vi.resetModules().
import './card-texture';
import { isSharedCardBackTexture } from './card-textures/card-back-texture';
import { createRecordingContext, type RecordedOp } from './card-textures/recording-context.test-helper';

const settings = vi.hoisted(() => ({ cardTheme: 'fantasy', cardNumberSize: 'medium' }));

vi.mock('@/presentation/components/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/presentation/components/settings')>();
  return { ...actual, loadGameSettings: () => ({ ...settings }) };
});

type Facade = typeof import('./card-texture');
type Quality = typeof import('./card-textures/card-texture-quality');
type BackTextures = typeof import('./card-textures/card-back-texture');
type CardMaterial = ReturnType<Facade['buildCardMaterials']>[number];
type MaterialOptions = Parameters<Facade['buildCardMaterials']>[1];

interface RecordedCanvas {
  width: number;
  height: number;
  ops: RecordedOp[];
  getContext: (type: string) => CanvasRenderingContext2D | null;
}

/** Every canvas the card textures create records its drawing calls */
function installCanvas() {
  const createElement = vi.fn((tagName: string): RecordedCanvas => {
    if (tagName !== 'canvas') throw new Error(`Unexpected element: ${tagName}`);
    const { ctx, ops } = createRecordingContext();
    return { width: 0, height: 0, ops, getContext: (type) => (type === '2d' ? ctx : null) };
  });
  vi.stubGlobal('document', { createElement });
  return createElement;
}

interface Page {
  facade: Facade;
  quality: Quality;
  backs: BackTextures;
}

/** A freshly loaded page: empty texture caches, renderer limit unknown, settings read on first use */
async function loadPage(): Promise<Page> {
  vi.resetModules();
  const facade = await import('./card-texture');
  const quality = await import('./card-textures/card-texture-quality');
  const backs = await import('./card-textures/card-back-texture');
  return { facade, quality, backs };
}

/** Builds during render and retains on commit, the way useCardMaterials does */
function mountCard(facade: Facade, card: ICard, options?: MaterialOptions): CardMaterial[] {
  const materials = facade.buildCardMaterials(card, options);
  facade.retainCardMaterials(materials);
  return materials;
}

function frontOf(materials: CardMaterial[]): THREE.Texture {
  const texture = materials[CARD_MATERIAL_SLOT.FRONT].map;
  if (!texture) throw new Error('Expected a front texture');
  return texture;
}

function backOf(materials: CardMaterial[]): THREE.Texture {
  const texture = materials[CARD_MATERIAL_SLOT.BACK].map;
  if (!texture) throw new Error('Expected a back texture');
  return texture;
}

function canvasOf(texture: THREE.Texture): RecordedCanvas {
  return texture.image as RecordedCanvas;
}

/** What saving a new card theme in the settings does */
function selectCardTheme(id: string): void {
  settings.cardTheme = id;
  window.dispatchEvent(new Event('settings-changed'));
}

const ELVES_7: ICard = { id: 'ELVES-7', type: CardType.NUMBER, suit: Suit.ELVES, value: 7 };
const DWARVES_5: ICard = { id: 'DWARVES-5', type: CardType.NUMBER, suit: Suit.DWARVES, value: 5 };
const HIDDEN: ICard = { id: 'hidden', type: CardType.NUMBER, suit: null, value: null };
const DRAGON: ICard = { id: 'DRAGON-0', type: CardType.DRAGON, suit: null, value: null };
const IPHONE = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 };
const DESKTOP = { userAgent: 'Mozilla/5.0 (Windows NT 10.0)', platform: 'Win32', maxTouchPoints: 0 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  settings.cardTheme = 'fantasy';
});

describe('card materials', () => {
  it.each([
    { label: 'an explicitly face-down card', card: ELVES_7, faceDown: true, showsFace: false },
    { label: 'a hidden placeholder card (suit and value unknown)', card: HIDDEN, faceDown: false, showsFace: false },
    { label: 'a face-up number card', card: ELVES_7, faceDown: false, showsFace: true },
    { label: 'a special card', card: DRAGON, faceDown: false, showsFace: true },
  ])('should paint the face of $label only when it is face up (face: $showsFace)', async ({ card, faceDown, showsFace }) => {
    installCanvas();
    const { facade } = await loadPage();
    const materials = mountCard(facade, card, { faceDown });

    expect(isSharedCardBackTexture(frontOf(materials))).toBe(!showsFace);
    expect(frontOf(materials) === backOf(materials)).toBe(!showsFace);
    facade.disposeCardMaterials(materials);
  });

  it('should share one cached back texture between cards and keep it on dispose', async () => {
    installCanvas();
    const { facade } = await loadPage();
    const first = mountCard(facade, { id: 'GIANTS-1', type: CardType.NUMBER, suit: Suit.GIANTS, value: 1 });
    const second = mountCard(facade, { id: 'GIANTS-2', type: CardType.NUMBER, suit: Suit.GIANTS, value: 2 });

    const sharedBack = backOf(first);
    expect(backOf(second)).toBe(sharedBack);
    expect(isSharedCardBackTexture(sharedBack)).toBe(true);
    expect(isSharedCardBackTexture(frontOf(first))).toBe(false);

    const disposeSpy = vi.spyOn(sharedBack, 'dispose');
    facade.disposeCardMaterials(first);
    facade.disposeCardMaterials(second);
    expect(disposeSpy).not.toHaveBeenCalled();
  });

  it('paints a face once and shares it across every mesh showing that card (hand, played, collecting)', async () => {
    const createElement = installCanvas();
    const { facade } = await loadPage();
    const hand = mountCard(facade, DWARVES_5, { renderMode: 'hand' });
    const canvasesAfterHand = createElement.mock.calls.length;
    const played = mountCard(facade, { ...DWARVES_5 });

    const face = frontOf(hand);
    expect(frontOf(played)).toBe(face);
    expect(createElement).toHaveBeenCalledTimes(canvasesAfterHand);

    const disposeFace = vi.spyOn(face, 'dispose');
    facade.disposeCardMaterials(hand);
    facade.disposeCardMaterials(played);
    // Released but kept (idle), so the next stage of the same card is still a cache hit
    expect(disposeFace).not.toHaveBeenCalled();
    const collecting = mountCard(facade, { ...DWARVES_5 });
    expect(frontOf(collecting)).toBe(face);
    expect(createElement).toHaveBeenCalledTimes(canvasesAfterHand);
  });

  it('gives each mesh its own front material so its tint does not leak to other cards', async () => {
    installCanvas();
    const { facade } = await loadPage();
    const first = mountCard(facade, ELVES_7);
    const second = mountCard(facade, ELVES_7);
    expect(first[CARD_MATERIAL_SLOT.FRONT]).not.toBe(second[CARD_MATERIAL_SLOT.FRONT]);
    expect(first[CARD_MATERIAL_SLOT.BACK]).toBe(second[CARD_MATERIAL_SLOT.BACK]);
  });

  it('uses near-matte card faces so the overhead light does not wash them out', async () => {
    installCanvas();
    const { facade } = await loadPage();
    const materials = mountCard(facade, { id: 'GIANTS-12', type: CardType.NUMBER, suit: Suit.GIANTS, value: 12 });
    expect(materials[CARD_MATERIAL_SLOT.FRONT].roughness).toBeGreaterThanOrEqual(0.6);
    expect(materials[CARD_MATERIAL_SLOT.FRONT].metalness).toBe(0);
  });
});

describe('card textures across a deck change', () => {
  it('should free the old deck\'s idle faces but keep the faces of cards still on the table', async () => {
    vi.stubGlobal('window', new EventTarget());
    installCanvas();
    const { facade } = await loadPage();
    const released = mountCard(facade, ELVES_7);
    const releasedFace = frontOf(released);
    facade.disposeCardMaterials(released);
    const onTable = mountCard(facade, DWARVES_5);
    const disposeReleased = vi.spyOn(releasedFace, 'dispose');
    const disposeOnTable = vi.spyOn(frontOf(onTable), 'dispose');

    selectCardTheme('classic');
    const repainted = mountCard(facade, ELVES_7);

    expect(disposeReleased).toHaveBeenCalled();
    expect(disposeOnTable).not.toHaveBeenCalled();
    expect(frontOf(repainted)).not.toBe(releasedFace);
  });

  it('should show the selected deck\'s back: one back for every deck on the default design, its own for the rest', async () => {
    vi.stubGlobal('window', new EventTarget());
    installCanvas();
    const { facade, backs } = await loadPage();
    const defaultBack = facade.getCurrentCardBackTexture();
    expect(backs.getCardBackTexture(null)).toBe(defaultBack);
    expect(backs.getCardBackTexture('no-such-deck')).toBe(defaultBack);

    const ownDesigns = Object.keys(CARD_BACK_DESIGNS).filter((id) => CARD_BACK_DESIGNS[id] !== DEFAULT_CARD_BACK);
    const ownBacks = ownDesigns.map((id) => backs.getCardBackTexture(id));
    expect(new Set([defaultBack, ...ownBacks]).size).toBe(ownDesigns.length + 1);

    selectCardTheme('halloween');
    expect(facade.getCurrentCardBackTexture()).toBe(backs.getCardBackTexture('halloween'));
    expect(backOf(mountCard(facade, ELVES_7))).toBe(backs.getCardBackTexture('halloween'));
  });
});

describe('card texture memory tier and filtering', () => {
  it('should rasterise faces on iOS at the compact tier size, scaling the art from the logical card', async () => {
    vi.stubGlobal('navigator', IPHONE);
    installCanvas();
    const { facade } = await loadPage();
    const face = canvasOf(frontOf(mountCard(facade, ELVES_7)));

    const { width, height } = CARD_TEXTURE_TIERS.compact;
    expect([face.width, face.height]).toEqual([width, height]);
    expect(face.ops[0]).toEqual({
      name: 'scale',
      args: [width / CARD_FACE_LOGICAL_SIZE.WIDTH, height / CARD_FACE_LOGICAL_SIZE.HEIGHT],
    });
  });

  it('should rasterise faces on desktop at the standard tier size without rescaling', async () => {
    vi.stubGlobal('navigator', DESKTOP);
    installCanvas();
    const { facade } = await loadPage();
    const face = canvasOf(frontOf(mountCard(facade, ELVES_7)));

    const { width, height } = CARD_TEXTURE_TIERS.standard;
    expect([face.width, face.height]).toEqual([width, height]);
    expect(face.ops[0]?.name).not.toBe('scale');
  });

  it('should re-filter cached faces and backs once the renderer reports its anisotropy', async () => {
    installCanvas();
    const { facade, quality } = await loadPage();
    const materials = mountCard(facade, ELVES_7);
    const textures = [frontOf(materials), backOf(materials)];
    const uploadedVersions = textures.map((texture) => texture.version);

    quality.setCardTextureMaxAnisotropy(CARD_TEXTURE_QUALITY.MAX_ANISOTROPY);

    textures.forEach((texture, i) => {
      expect(texture.anisotropy).toBe(CARD_TEXTURE_QUALITY.MAX_ANISOTROPY);
      // A version bump makes three.js upload the texture again with the new filtering
      expect(texture.version).toBeGreaterThan(uploadedVersions[i]);
    });
  });
});
