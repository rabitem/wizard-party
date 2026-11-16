import * as THREE from 'three';
import { HorizontalBlurShader, VerticalBlurShader } from 'three-stdlib';
import type { TableContactShadowProps } from './table-visual-materials';

/** Offscreen resources for a baked shadow; transient GPU programs are released after baking. */
export function createContactShadowBake({ resolution, scale, color }: TableContactShadowProps) {
  const target = new THREE.WebGLRenderTarget(resolution, resolution);
  const scratch = new THREE.WebGLRenderTarget(resolution, resolution);
  target.texture.generateMipmaps = scratch.texture.generateMipmaps = false;
  const geometry = new THREE.PlaneGeometry(scale, scale).rotateX(Math.PI / 2);
  const depth = new THREE.MeshDepthMaterial({ depthTest: false, depthWrite: false });
  depth.onBeforeCompile = shader => {
    shader.uniforms.ucolor = { value: new THREE.Color(color) };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 ucolor;\nvoid main() {')
      .replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );');
  };
  const horizontal = new THREE.ShaderMaterial({ ...HorizontalBlurShader, uniforms: THREE.UniformsUtils.clone(HorizontalBlurShader.uniforms), depthTest: false });
  const vertical = new THREE.ShaderMaterial({ ...VerticalBlurShader, uniforms: THREE.UniformsUtils.clone(VerticalBlurShader.uniforms), depthTest: false });
  const quad = new THREE.Mesh(geometry);
  let frames = 0;
  return {
    target, geometry,
    reset: () => { frames = 0; },
    render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, host: THREE.Group, props: TableContactShadowProps) {
      if (frames >= props.frames || renderer.getContext().isContextLost()) return;
      const previous = { target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), level: renderer.getActiveMipmapLevel(), background: scene.background, override: scene.overrideMaterial, visible: host.visible };
      const blur = (amount: number) => {
        quad.material = horizontal;
        horizontal.uniforms.tDiffuse.value = target.texture;
        horizontal.uniforms.h.value = amount / 256;
        renderer.setRenderTarget(scratch);
        renderer.render(quad, camera);
        quad.material = vertical;
        vertical.uniforms.tDiffuse.value = scratch.texture;
        vertical.uniforms.v.value = amount / 256;
        renderer.setRenderTarget(target);
        renderer.render(quad, camera);
      };
      try {
        host.visible = false;
        scene.background = null;
        scene.overrideMaterial = depth;
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        blur(props.blur);
        blur(props.blur * 0.4);
        frames++;
      } finally {
        scene.background = previous.background;
        scene.overrideMaterial = previous.override;
        host.visible = previous.visible;
        renderer.setRenderTarget(previous.target, previous.face, previous.level);
      }
      if (frames >= props.frames) {
        // Material objects remain reusable after context restoration; their GPU programs do not.
        depth.dispose(); horizontal.dispose(); vertical.dispose(); scratch.dispose();
      }
    },
    dispose() { target.dispose(); scratch.dispose(); geometry.dispose(); depth.dispose(); horizontal.dispose(); vertical.dispose(); },
  };
}
