import type { AmbientBehaviour } from '@/presentation/config/seasonal-ambience.config';
import type { Behaviour } from '../types';
import { fallBehaviour, flutterBehaviour } from './falling';
import { driftBehaviour, fogBehaviour } from './drifting';
import { batBehaviour, shootingBehaviour } from './occasional';
import { glintBehaviour, rainBehaviour } from './streaks';
import { twinkleBehaviour } from './twinkle';

/** Motion model per behaviour id (see AmbientBehaviour). */
export const BEHAVIOURS: Record<AmbientBehaviour, Behaviour> = {
  fall: fallBehaviour,
  flutter: flutterBehaviour,
  drift: driftBehaviour,
  fog: fogBehaviour,
  bat: batBehaviour,
  rain: rainBehaviour,
  twinkle: twinkleBehaviour,
  shooting: shootingBehaviour,
  glint: glintBehaviour,
};
