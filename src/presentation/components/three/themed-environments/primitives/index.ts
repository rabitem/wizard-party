export { RoomShell, ROOM_WALLS } from './RoomShell';
export { SceneFog } from './SceneFog';
export { InstancedProp } from './InstancedProp';
export { PumpkinPatch, type PumpkinPlacement } from './PumpkinPatch';
export { CandleCluster, type CandlePlacement } from './CandleCluster';
export { GlowSprites, type GlowPoint } from './GlowSprites';
export { createFlameMaterial, createGlowMaterial, createGlowMeshMaterial, getGlowTexture } from './glow';
export { localMatrix, placementMatrix, seededRandom, type PropPlacement } from './instancing';
export { useFlicker, type FlickerTarget } from './useFlicker';
export { useDisposables } from './useDisposables';
export { usePrefersReducedMotion } from './usePrefersReducedMotion';
export { createPlankTexture } from './procedural-textures';
export { MatrixInstances } from './MatrixInstances';
export { createPaintedTexture, fillVerticalGradient } from './canvas-texture';
export {
  addSurfaceDetail,
  createPbrMaterial,
  getPbrTextureSet,
  LightShafts,
  RealisticParticleField,
  SoftGroundFog,
  useDeviceTier,
  WindowSnowView,
  type LightShaft,
  type ParticleVolume,
} from './realism';
