/** The part of the Rapier world the activity probe reads. */
export interface ActiveBodySource {
  forEachActiveRigidBody(callback: (body: { isDynamic(): boolean }) => void): void;
}

/**
 * True while any dynamic rigid body is awake (thrown cards, knocked chips). Kinematic bodies are
 * scripted by components whose motion the scene monitor already sees; sleeping bodies cost nothing.
 */
export function hasAwakeDynamicBodies(world: ActiveBodySource): boolean {
  let awake = false;
  world.forEachActiveRigidBody((body) => {
    if (!awake && body.isDynamic()) awake = true;
  });
  return awake;
}
