'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { EnvironmentAtmosphere as AtmosphereConfig } from '@/presentation/config/realism-atmosphere.config';

interface EnvironmentAtmosphereProps {
  atmosphere: AtmosphereConfig | null;
}

/**
 * Applies a room's atmosphere: tone-mapping exposure (restored on unmount)
 * and optional shadowless warm key / cool fill / ambient lights. Bloom is
 * handled by PostProcessing, which reads the same config. Renders nothing
 * for rooms without an atmosphere (the casino).
 */
export function EnvironmentAtmosphere({ atmosphere }: EnvironmentAtmosphereProps) {
  const getState = useThree((state) => state.get);
  const exposure = atmosphere?.exposure;

  useEffect(() => {
    if (exposure === undefined) return;
    const { gl } = getState();
    const previous = gl.toneMappingExposure;
    gl.toneMappingExposure = exposure;
    return () => {
      gl.toneMappingExposure = previous;
    };
  }, [getState, exposure]);

  if (!atmosphere) return null;
  const { ambient, key, fill } = atmosphere;
  return (
    <>
      {ambient ? <ambientLight color={ambient.color} intensity={ambient.intensity} /> : null}
      {key ? <directionalLight position={key.position} color={key.color} intensity={key.intensity} /> : null}
      {fill ? <directionalLight position={fill.position} color={fill.color} intensity={fill.intensity} /> : null}
    </>
  );
}
