'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { createContactShadowBake } from './contact-shadow-bake';
import type { TableContactShadowProps } from './table-visual-materials';

/** Same baked depth/blur shadow, with GPU scratch resources released once the bake finishes. */
export function BakedContactShadow({ position, ...props }: TableContactShadowProps & { position: [number, number, number] }) {
  const host = useRef<THREE.Group>(null);
  const camera = useRef<THREE.OrthographicCamera>(null);
  const gl = useThree(state => state.gl);
  const scene = useThree(state => state.scene);
  const invalidate = useThree(state => state.invalidate);
  const { scale, resolution, color } = props;
  const bake = useMemo(() => createContactShadowBake({ ...props, scale, resolution, color }), [scale, resolution, color]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => { if (host.current && camera.current) bake.render(gl, scene, camera.current, host.current, props); });
  useEffect(() => {
    const restored = () => { bake.reset(); invalidate(); };
    gl.domElement.addEventListener('webglcontextrestored', restored);
    return () => { gl.domElement.removeEventListener('webglcontextrestored', restored); bake.dispose(); };
  }, [bake, gl, invalidate]);
  return (
    <group ref={host} rotation-x={Math.PI / 2} position={position}>
      <mesh geometry={bake.geometry} scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial transparent map={bake.target.texture} opacity={props.opacity} depthWrite={false} />
      </mesh>
      <orthographicCamera ref={camera} args={[-scale / 2, scale / 2, scale / 2, -scale / 2, 0, props.far]} />
    </group>
  );
}
