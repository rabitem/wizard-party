import { AmbientLight, AnimationMixer, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer, type Object3D } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CHARACTER_SLOTS, type CharacterAppearance } from '@shared/domain/character';

import { CHARACTER_CLIPS, CHARACTER_PORTRAIT } from '@/presentation/config/character.config';
import { loadCharacterAnimations, loadCharacterModel } from './character-assets';
import { ownFigureMaterials } from './character-palette';
import { applyAppearance } from './character-parts';

/** Portraits look the same for the same parts in every slot. */
export function portraitKey(appearance: CharacterAppearance): string {
  return CHARACTER_SLOTS.map((slot) => appearance[slot]).join('|');
}

interface PortraitStage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  figure: Object3D;
  head: Object3D;
}

let stage: Promise<PortraitStage> | null = null;

/** One hidden canvas and one posed figure for every portrait on the page. */
async function createStage(): Promise<PortraitStage> {
  const [model, motion] = await Promise.all([loadCharacterModel(), loadCharacterAnimations()]);
  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(CHARACTER_PORTRAIT.SIZE_PX, CHARACTER_PORTRAIT.SIZE_PX, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 0.9));
  const key = new DirectionalLight(0xffffff, 1.7);
  key.position.set(1.5, 3, 3);
  scene.add(key);
  const figure = clone(model.scene);
  ownFigureMaterials(figure);
  scene.add(figure);
  const idle = motion.animations.find((clip) => clip.name === CHARACTER_CLIPS.IDLE);
  if (idle) {
    const mixer = new AnimationMixer(figure);
    mixer.clipAction(idle).play();
    mixer.setTime(CHARACTER_PORTRAIT.POSE_SECONDS);
  }
  figure.updateMatrixWorld(true);
  const head = figure.getObjectByName('head') ?? figure;
  const camera = new PerspectiveCamera(CHARACTER_PORTRAIT.FOV_DEGREES, 1, 0.1, 50);
  return { renderer, scene, camera, figure, head };
}

function renderOnStage({ renderer, scene, camera, figure, head }: PortraitStage, appearance: CharacterAppearance): string {
  applyAppearance(figure, appearance);
  const headPosition = head.getWorldPosition(new Vector3());
  camera.position.copy(headPosition).add(new Vector3(...CHARACTER_PORTRAIT.CAMERA_OFFSET));
  camera.lookAt(headPosition.add(new Vector3(...CHARACTER_PORTRAIT.TARGET_OFFSET)));
  renderer.render(scene, camera);
  // Read right after rendering, in the same task, so no preserveDrawingBuffer is needed.
  return renderer.domElement.toDataURL('image/webp');
}

const cache = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

/**
 * A data URL of the look's head and shoulders on a transparent background. Renders run one at a
 * time on the shared stage; results are cached per look (CHARACTER_PORTRAIT.CACHE_LIMIT).
 */
export function renderCharacterPortrait(appearance: CharacterAppearance): Promise<string> {
  const key = portraitKey(appearance);
  const cached = cache.get(key);
  if (cached) return cached;
  stage ??= createStage().catch((error: unknown) => {
    stage = null;
    throw error;
  });
  const rendering = queue.then(async () => renderOnStage(await (stage as Promise<PortraitStage>), appearance));
  queue = rendering.catch(() => undefined);
  cache.set(key, rendering);
  rendering.catch(() => cache.delete(key));
  if (cache.size > CHARACTER_PORTRAIT.CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return rendering;
}
