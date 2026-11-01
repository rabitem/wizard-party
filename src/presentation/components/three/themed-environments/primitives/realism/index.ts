/**
 * Realism toolkit for the themed rooms. Everything is procedural (no assets),
 * GPU-driven, scales with the device tier and respects reduced motion.
 * Configuration: config/realism.config.ts (particles, tiers, window views)
 * and config/realism-atmosphere.config.ts (per-room exposure / bloom / lights).
 *
 * PARTICLES - one THREE.Points draw call, motion fully in the vertex shader:
 *
 *   <RealisticParticleField
 *     kind="snow"            // snow | rain | leaves | petals | embers | dust | fireflies | pollen
 *     volume={{ center: [0, -0.5, 0], halfSize: [14, 13], bottom: -0.5, top: 9 }}
 *     count={500}            // optional base count (high tier); scaled down per tier / reduced motion
 *     wind={[0.2, 0, 0.05]}  // optional, plus gust / fallSpeed / sway / turbulence / colors / sizeScale
 *     clearRadius={3.4}      // default: fades particles above the table so cards stay readable; 0 = off
 *   />
 *
 * ATMOSPHERE
 *
 *   <LightShafts shafts={SHAFTS} color="#ffe8c0" intensity={0.15} dust={DUST_VOLUME} />
 *     SHAFTS: module constant of { source, target, radiusStart, radiusEnd }.
 *   <SoftGroundFog size={[24, 22]} height={0.6} color="#cfd8e6" opacity={0.3} />
 *   <WindowSnowView position={[x, y, z + 0.01]} rotation={[0, 0, 0]} size={[1.4, 1.8]}
 *     variant="night" precipitation="snow" frost={0.6} />
 *     Ray-cast outdoor view with parallax; works for day/dusk/rain views too
 *     (override colours with `palette`). Frame it with your own geometry.
 *
 * MATERIALS - cached procedural PBR sets (do not dispose the textures):
 *
 *   const floor = useMemo(() => createPbrMaterial('wood', { color: '#6b4426', repeat: [4, 4] }), []);
 *   const set = getPbrTextureSet('brick', { repeat: [3, 2] });   // { map, roughnessMap, normalMap }
 *   addSurfaceDetail(existingStandardMaterial, { scale: 6, normalStrength: 0.2 });
 *   Surfaces: wood, stone, brick, plaster, fabric, snow (with sparkle), wetFloor (puddles).
 *
 * LIGHTING / POST - add or tune your room in ENVIRONMENT_ATMOSPHERES
 * (realism-atmosphere.config.ts): exposure, optional shadowless key / fill /
 * ambient lights, optional bloom (threshold high: only flames, neon and
 * emissives glow). ThemedEnvironment and PostProcessing apply it; the casino
 * has no entry and is unchanged. For a bloom-friendly glow, give emissive
 * materials emissiveIntensity > 1 or use toneMapped: false colours.
 *
 * QUALITY - useDeviceTier() / getDeviceTier() return 'low' | 'medium' | 'high'.
 */
export { RealisticParticleField, type ParticleVolume } from './RealisticParticleField';
export { LightShafts, type LightShaft } from './LightShafts';
export { SoftGroundFog } from './SoftGroundFog';
export { WindowSnowView } from './WindowSnowView';
export { EnvironmentAtmosphere } from './EnvironmentAtmosphere';
export { createPbrMaterial, getPbrTextureSet } from './pbr-textures';
export { addSurfaceDetail } from './surface-detail';
export { useDeviceTier } from './device-tier';
export { particleCountForTier } from './particle-buffers';
export { getParticleSprite } from './particle-sprites';
export { getFogNoiseTexture } from './noise-texture';
export { shaderUniforms } from './shader-uniforms';
