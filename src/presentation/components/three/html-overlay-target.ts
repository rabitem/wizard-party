import type { RootState } from '@react-three/fiber';

/**
 * drei `<Html>` resolves its DOM target as `events.connected || gl.domElement.parentNode`
 * and re-creates its private React root on the same element whenever that target changes.
 * R3F only connects events in the Canvas's onCreated, which runs after the scene's first
 * layout effects, so an `<Html>` mounted in that first commit re-roots once. The stale
 * root's deferred first commit then clears the live root's DOM, and the next Canvas
 * teardown throws NotFoundError (removeChild). Mounting `<Html>` only once events are
 * connected keeps its target stable for the whole Canvas lifetime.
 */
export function selectHtmlOverlayTargetReady(state: Pick<RootState, 'events'>): boolean {
  return Boolean(state.events.connected);
}
