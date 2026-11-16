import * as THREE from 'three';

const BILLBOARD = /* glsl */ `
mat4 glowWorld = modelMatrix * instanceMatrix;
vec4 mvPosition = viewMatrix * glowWorld * vec4(0.0, 0.0, 0.0, 1.0);
vec2 glowScale = vec2(length(glowWorld[0].xyz), length(glowWorld[1].xyz));
if (uGlowAttenuation < 0.5 && isPerspectiveMatrix(projectionMatrix)) glowScale *= -mvPosition.z;
vec2 glowCorner = vec2(cos(uGlowRotation) * position.x - sin(uGlowRotation) * position.y,
                       sin(uGlowRotation) * position.x + cos(uGlowRotation) * position.y);
mvPosition.xy += glowCorner * glowScale;
gl_Position = projectionMatrix * mvPosition;
`;

export function createGlowBillboards(source: THREE.SpriteMaterial) {
  const rotation = { value: source.rotation };
  const attenuation = { value: source.sizeAttenuation ? 1 : 0 };
  const material = new THREE.MeshBasicMaterial({
    map: source.map, alphaMap: source.alphaMap, color: source.color,
    transparent: source.transparent, opacity: source.opacity, blending: source.blending,
    depthWrite: source.depthWrite, depthTest: source.depthTest, toneMapped: source.toneMapped,
    fog: source.fog, alphaTest: source.alphaTest, premultipliedAlpha: source.premultipliedAlpha,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.uGlowRotation = rotation;
    shader.uniforms.uGlowAttenuation = attenuation;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uGlowRotation;\nuniform float uGlowAttenuation;')
      .replace('#include <project_vertex>', BILLBOARD);
  };
  material.customProgramCacheKey = () => 'instanced-glow-billboards-v1';
  return { material, geometry: new THREE.PlaneGeometry(),
    sync() { material.opacity = source.opacity; material.color.copy(source.color); rotation.value = source.rotation; attenuation.value = source.sizeAttenuation ? 1 : 0; },
  };
}
