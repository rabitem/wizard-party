import { useRef } from 'react';
import { useAfterPhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { DecorationRestTracker } from './decoration-rest';

/** Chips and coasters use the same sustained-rest policy as cards, on physics time. */
export function useDecorationRest() {
  const bodies = useRef<(RapierRigidBody | null)[] | null>(null);
  const tracker = useRef(new DecorationRestTracker());
  useAfterPhysicsStep((world) => {
    for (const body of bodies.current ?? []) {
      if (body) tracker.current.step(body, world.timestep * 1000);
    }
  });
  return bodies;
}
