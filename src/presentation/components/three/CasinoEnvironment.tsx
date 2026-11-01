'use client';

import { CasinoBanner } from './CasinoBanner';
import { CasinoFloor, CasinoCeiling, CasinoWall } from './CasinoStructures';
import { SlotMachine } from './SlotMachine';
import { StaticBatch } from './batching';
import { useRenderQuality } from './render-quality';

/** Practical room lights; tiers without room accent lights rely on the hemisphere fill alone. */
function CasinoRoomLights() {
  const { profile } = useRenderQuality();
  return (
    <>
      {profile.roomAccentLights ? (
        <>
          <pointLight position={[0, 4, -10]} color="#b8875f" intensity={1.1} distance={20} decay={2} />
          <pointLight position={[0, 3, 8]} color="#6f7f86" intensity={0.55} distance={15} decay={2} />
        </>
      ) : null}

      {/* Hemisphere light for warm room fill */}
      <hemisphereLight args={['#30261d', '#0c0906', 0.28]} position={[0, 10, 0]} />
    </>
  );
}

/**
 * Main casino environment component - orchestrates all casino elements. The room is static decor,
 * so it is drawn as a handful of merged meshes (StaticBatch) instead of ~280 separate draws.
 */
export function CasinoEnvironment() {
  return (
    <StaticBatch>
      {/* No fog: a <fog attach="fog"> inside this group never reached the scene, so the casino
          has always rendered fog-free. Themed rooms use SceneFog (themed-environments/primitives). */}

      {/* Background color gradient simulation */}
      <mesh position={[0, 5, -25]} scale={[80, 30, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#070604" />
      </mesh>

      {/* Casino floor */}
      <CasinoFloor />

      {/* Casino ceiling */}
      <CasinoCeiling />

      {/* Walls */}
      <CasinoWall position={[0, 4, -15]} rotation={[0, 0, 0]} width={35} height={10} />
      <CasinoWall position={[-17, 4, 0]} rotation={[0, Math.PI / 2, 0]} width={35} height={10} />
      <CasinoWall position={[17, 4, 0]} rotation={[0, -Math.PI / 2, 0]} width={35} height={10} />

      {/* Casino Banner */}
      <CasinoBanner />

      {/* Slot machines along back wall - reduced count */}
      <SlotMachine position={[-7, 0, -12]} rotation={[0, 0.1, 0]} scale={1.1} variant={0} />
      <SlotMachine position={[-4.5, 0, -12.5]} rotation={[0, 0.05, 0]} scale={1.1} variant={1} />
      <SlotMachine position={[4.5, 0, -12.5]} rotation={[0, -0.05, 0]} scale={1.1} variant={2} />
      <SlotMachine position={[7, 0, -12]} rotation={[0, -0.1, 0]} scale={1.1} variant={3} />

      {/* Left wall slot machines */}
      <SlotMachine position={[-14, 0, -6]} rotation={[0, Math.PI / 2.3, 0]} scale={1} variant={0} />
      <SlotMachine position={[-14.5, 0, -2]} rotation={[0, Math.PI / 2.1, 0]} scale={1} variant={1} />
      <SlotMachine position={[-14, 0, 2]} rotation={[0, Math.PI / 2, 0]} scale={1} variant={2} />

      {/* Right wall slot machines */}
      <SlotMachine position={[14, 0, -6]} rotation={[0, -Math.PI / 2.3, 0]} scale={1} variant={3} />
      <SlotMachine position={[14.5, 0, -2]} rotation={[0, -Math.PI / 2.1, 0]} scale={1} variant={0} />
      <SlotMachine position={[14, 0, 2]} rotation={[0, -Math.PI / 2, 0]} scale={1} variant={1} />

      <CasinoRoomLights />
    </StaticBatch>
  );
}
