import { REST_DETECTION } from '@/presentation/config/rapier.config';
import { isVelocityAtRest } from '../three/physics-utils';

interface DecorationBody {
  isSleeping(): boolean;
  linvel(): { x: number; y: number; z: number };
  angvel(): { x: number; y: number; z: number };
  translation(): { y: number };
  sleep(): void;
}

/** Settle a decoration group together, so a sleeping lower chip never destabilises its stack. */
export class DecorationRestTracker {
  private quietMs = 0;

  step(bodies: readonly DecorationBody[], deltaMs: number): void {
    // Fallen bodies keep simulating; they neither freeze nor prevent the table props settling.
    const supported = bodies.filter(body => body.translation().y >= REST_DETECTION.FALLEN_Y_THRESHOLD);
    const awake = supported.filter(body => !body.isSleeping());
    if (!awake.length || awake.some(body => !isVelocityAtRest(body.linvel(), body.angvel()))) {
      this.quietMs = 0;
      return;
    }
    this.quietMs += deltaMs;
    if (this.quietMs >= REST_DETECTION.FRAMES_UNTIL_REST * REST_DETECTION.CHECK_INTERVAL_MS) {
      // Sleeping individual members early leaves other members pushing into immovable contacts.
      // Let the solver settle the whole group before sleeping it in one physics step.
      awake.forEach(body => body.sleep());
      this.quietMs = 0;
    }
  }
}
