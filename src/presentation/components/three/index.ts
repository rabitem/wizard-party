// =============================================================================
// Three.js Components Barrel Export
// =============================================================================

// Core Scene
export { Game3DScene } from './Game3DScene';

// Physics Card Components (used by GameTable, StackedDeck)
export {
  PhysicsPlayedCard,
  type ServerPhysicsState,
  type PendingCardPlay,
} from './PhysicsPlayedCard';
export { PhysicsCard3D } from './PhysicsCard3D';
export type { PhysicsCard3DHandle } from './types';
export { calculatePlayedCardRestPosition } from './played-card-rest-position';

// Visual Effects (used by GameTable)
export { TrickWinParticles } from './TrickWinParticles';
export { SparkleParticles } from './SparkleParticles';
