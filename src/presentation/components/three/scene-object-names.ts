/**
 * Stable Object3D names for the animated card objects in the game scene.
 *
 * They let one card be followed through hand -> drag -> table -> collection -> deck by its id:
 * the throw looks up the hand or dragged card it launches from (pending-card-play.ts), and
 * diagnostics such as the animation sandbox probe sample them every frame. Renaming a kind
 * means updating both.
 */
export const SCENE_OBJECT_KINDS = ['hand-card', 'dragged-card', 'played-card', 'collecting-card', 'deck-card'] as const;

export type SceneObjectKind = typeof SCENE_OBJECT_KINDS[number];

const SEPARATOR = ':';

export function sceneObjectName(kind: SceneObjectKind, cardId: string): string {
  return `${kind}${SEPARATOR}${cardId}`;
}

export function parseSceneObjectName(name: string): { kind: SceneObjectKind; cardId: string } | null {
  const separatorIndex = name.indexOf(SEPARATOR);
  if (separatorIndex <= 0) return null;

  const kind = name.slice(0, separatorIndex);
  if (!(SCENE_OBJECT_KINDS as readonly string[]).includes(kind)) return null;

  return { kind: kind as SceneObjectKind, cardId: name.slice(separatorIndex + 1) };
}
