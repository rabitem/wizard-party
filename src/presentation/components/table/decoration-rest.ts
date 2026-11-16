import { REST_DETECTION } from '@/presentation/config/rapier.config';
import { isVelocityAtRest } from '../three/physics-utils';

interface DecorationBody {
  isSleeping(): boolean;
  linvel(): { x: number; y: number; z: number };
  angvel(): { x: number; y: number; z: number };
  translation(): { y: number };
  sleep(): void;
}

/** Settle contact jitter after sustained rest; Rapier still wakes a chip when a card hits it. */
export class DecorationRestTracker {
  private readonly quietMs = new WeakMap<DecorationBody, number>();

  step(body: DecorationBody, deltaMs: number): void {
    if (body.isSleeping() || body.translation().y < REST_DETECTION.FALLEN_Y_THRESHOLD ||
        !isVelocityAtRest(body.linvel(), body.angvel())) {
      this.quietMs.delete(body);
      return;
    }
    const quiet = (this.quietMs.get(body) ?? 0) + deltaMs;
    if (quiet >= REST_DETECTION.FRAMES_UNTIL_REST * REST_DETECTION.CHECK_INTERVAL_MS) {
      body.sleep();
      this.quietMs.delete(body);
    } else this.quietMs.set(body, quiet);
  }
}
