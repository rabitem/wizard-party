/**
 * Fixed-capacity particle pool for the card-land effects.
 *
 * Pure data (no three.js): every channel lives in a preallocated typed array,
 * so a burst never allocates. The render-facing arrays (position, color,
 * alpha, size, rotation, flip) are handed straight to BufferAttributes.
 */

export interface ParticleSpawn {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Seconds the particle is visible (after its delay). */
  life: number;
  /** World-space sprite size. */
  size: number;
  r: number;
  g: number;
  b: number;
  /** Peak opacity, defaults to 1. */
  opacity?: number;
  /** Seconds before the particle appears. */
  delay?: number;
  rotation?: number;
  /** Radians per second. */
  spin?: number;
  /** Sideways sway amplitude (leaves, petals); also enables the tumble flip. */
  flutter?: number;
  /** Random phase in radians for sway / twinkle. */
  phase?: number;
}

export interface ParticleStepParams {
  /** Vertical acceleration (negative = falls). */
  gravity: number;
  /** Per-60fps-frame velocity multiplier. */
  drag: number;
  /** Local floor height; particles settle there. null = no floor. */
  floorY: number | null;
  /** Sway angular frequency. */
  flutterFreq: number;
  /** Size multiplier reached at the end of life. */
  growth: number;
  /** Fraction of life spent fading in. */
  fadeIn: number;
  /** Fade-out curve exponent (higher = holds longer, then drops). */
  fadePow: number;
  /** Twinkle frequency; 0 disables. */
  twinkle: number;
  /** Quantise alpha into this many steps (retro fade); 0 = smooth. */
  alphaSteps: number;
}

export const DEFAULT_STEP_PARAMS: Readonly<ParticleStepParams> = {
  gravity: 0,
  drag: 1,
  floorY: null,
  flutterFreq: 7,
  growth: 1,
  fadeIn: 0.08,
  fadePow: 1.5,
  twinkle: 0,
  alphaSteps: 0,
};

/** Settled particles keep this share of their horizontal speed per bounce. */
const FLOOR_FRICTION = 0.35;
/** Smallest visible tumble width so a flipping sprite never vanishes. */
const MIN_FLIP = 0.2;

export class ParticlePool {
  readonly capacity: number;
  count = 0;

  // Render-facing channels
  readonly position: Float32Array;
  readonly color: Float32Array;
  readonly alpha: Float32Array;
  readonly size: Float32Array;
  readonly rotation: Float32Array;
  readonly flip: Float32Array;

  // Simulation state
  private readonly velocity: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly delay: Float32Array;
  private readonly baseSize: Float32Array;
  private readonly peak: Float32Array;
  private readonly spin: Float32Array;
  private readonly flutter: Float32Array;
  private readonly phase: Float32Array;
  private readonly settled: Uint8Array;

  constructor(capacity: number) {
    this.capacity = Math.max(0, Math.floor(capacity));
    const n = this.capacity;
    this.position = new Float32Array(n * 3);
    this.color = new Float32Array(n * 3);
    this.alpha = new Float32Array(n);
    this.size = new Float32Array(n);
    this.rotation = new Float32Array(n);
    this.flip = new Float32Array(n).fill(1);
    this.velocity = new Float32Array(n * 3);
    this.age = new Float32Array(n);
    this.life = new Float32Array(n);
    this.delay = new Float32Array(n);
    this.baseSize = new Float32Array(n);
    this.peak = new Float32Array(n);
    this.spin = new Float32Array(n);
    this.flutter = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.settled = new Uint8Array(n);
  }

  /** Forget every particle; arrays are reused by the next burst. */
  reset(): void {
    this.count = 0;
  }

  /** Adds a particle; returns its index, or -1 when the pool is full. */
  spawn(p: ParticleSpawn): number {
    if (this.count >= this.capacity) return -1;
    const i = this.count++;
    const i3 = i * 3;
    this.position[i3] = p.x;
    this.position[i3 + 1] = p.y;
    this.position[i3 + 2] = p.z;
    this.velocity[i3] = p.vx;
    this.velocity[i3 + 1] = p.vy;
    this.velocity[i3 + 2] = p.vz;
    this.color[i3] = p.r;
    this.color[i3 + 1] = p.g;
    this.color[i3 + 2] = p.b;
    this.age[i] = 0;
    this.life[i] = Math.max(1e-3, p.life);
    this.delay[i] = p.delay ?? 0;
    this.baseSize[i] = p.size;
    this.size[i] = p.size;
    this.peak[i] = p.opacity ?? 1;
    this.alpha[i] = 0;
    this.rotation[i] = p.rotation ?? 0;
    this.spin[i] = p.spin ?? 0;
    this.flutter[i] = p.flutter ?? 0;
    this.phase[i] = p.phase ?? 0;
    this.flip[i] = 1;
    this.settled[i] = 0;
    return i;
  }

  /** Advances every particle by dt seconds and refreshes the render channels. */
  step(dt: number, params: Readonly<ParticleStepParams>): void {
    const dragFactor = Math.pow(params.drag, dt * 60);
    for (let i = 0; i < this.count; i++) {
      this.age[i] += dt;
      const local = this.age[i] - this.delay[i];
      if (local < 0) {
        this.alpha[i] = 0;
        continue;
      }
      this.integrate(i, dt, dragFactor, params);
      const t = Math.min(1, local / this.life[i]);
      this.size[i] = this.baseSize[i] * (1 + (params.growth - 1) * t);
      this.alpha[i] = this.peak[i] * particleAlpha(t, local, this.phase[i], params);
      if (this.flutter[i] > 0 && !this.settled[i]) {
        const f = Math.cos(local * params.flutterFreq * 0.8 + this.phase[i]);
        this.flip[i] = Math.sign(f || 1) * Math.max(MIN_FLIP, Math.abs(f));
      }
    }
  }

  /** Number of particles still visible (or waiting on their delay). */
  aliveCount(): number {
    let alive = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.age[i] < this.delay[i] + this.life[i]) alive++;
    }
    return alive;
  }

  private integrate(i: number, dt: number, dragFactor: number, params: Readonly<ParticleStepParams>): void {
    const i3 = i * 3;
    if (this.settled[i]) {
      this.velocity[i3] *= FLOOR_FRICTION;
      this.velocity[i3 + 2] *= FLOOR_FRICTION;
    } else {
      this.velocity[i3 + 1] += params.gravity * dt;
      this.velocity[i3] *= dragFactor;
      this.velocity[i3 + 1] *= dragFactor;
      this.velocity[i3 + 2] *= dragFactor;
      this.rotation[i] += this.spin[i] * dt;
    }
    let sway = 0;
    let swayZ = 0;
    if (this.flutter[i] > 0 && !this.settled[i]) {
      const a = this.age[i] * params.flutterFreq + this.phase[i];
      sway = Math.cos(a) * this.flutter[i];
      swayZ = Math.sin(a * 0.7) * this.flutter[i] * 0.5;
    }
    this.position[i3] += (this.velocity[i3] + sway) * dt;
    this.position[i3 + 1] += this.velocity[i3 + 1] * dt;
    this.position[i3 + 2] += (this.velocity[i3 + 2] + swayZ) * dt;
    if (params.floorY !== null && this.position[i3 + 1] <= params.floorY && this.velocity[i3 + 1] <= 0) {
      this.position[i3 + 1] = params.floorY;
      this.velocity[i3 + 1] = 0;
      this.settled[i] = 1;
      this.flip[i] = 1;
    }
  }
}

/** Fade-in, fade-out envelope with optional twinkle and retro stepping. */
function particleAlpha(
  t: number,
  localAge: number,
  phase: number,
  params: Pick<ParticleStepParams, 'fadeIn' | 'fadePow' | 'twinkle' | 'alphaSteps'>,
): number {
  if (t >= 1) return 0;
  let a: number;
  if (params.fadeIn > 0 && t < params.fadeIn) {
    a = t / params.fadeIn;
  } else {
    const span = 1 - params.fadeIn;
    const out = span > 0 ? (t - params.fadeIn) / span : 1;
    a = 1 - Math.pow(Math.min(1, Math.max(0, out)), params.fadePow);
  }
  if (params.twinkle > 0) a *= 0.55 + 0.45 * Math.sin(localAge * params.twinkle + phase);
  if (params.alphaSteps > 0) a = Math.ceil(a * params.alphaSteps) / params.alphaSteps;
  return Math.max(0, Math.min(1, a));
}
