/**
 * A small vocabulary for describing sounds as ffmpeg filter graphs (see generate-sounds.mjs).
 *
 * A design is { name, dur, layers, post?, level? }. Each layer is one aevalsrc expression evaluated
 * per sample (t = seconds since the layer starts, n = sample index) plus static ffmpeg filters.
 * Expression registers carry state between samples: 0 oscillator phase, 1 and 4 noise seeds,
 * 2-3 filter state, 5-9 per-sample parameters.
 */
export const SAMPLE_RATE = 44100;
// Partials above this are skipped so harmonic stacks never alias.
const PARTIAL_LIMIT_HZ = 16000;
const DECLICK_SECONDS = 0.008;

/** Formats a number for an ffmpeg expression (no exponent notation, negatives parenthesised). */
export function num(value) {
  const text = value.toFixed(8).replace(/\.?0+$/, '');
  if (text === '-0' || text === '') return '0';
  return value < 0 ? `(${text})` : text;
}

const term = (value) => (typeof value === 'number' ? num(value) : `(${value})`);
const range = (count) => Array.from({ length: count }, (_, index) => index + 1);

const SEMITONES = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
const ACCIDENTALS = { '': 0, '#': 1, b: -1 };

/** 'A4' -> 440, 'Bb3' -> 233.08; numbers pass through. */
export function hz(note) {
  if (typeof note === 'number') return note;
  const match = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!match) throw new Error(`Unknown note ${note}`);
  const [, letter, accidental = '', octave] = match;
  return 440 * 2 ** ((SEMITONES[letter] + ACCIDENTALS[accidental] + (Number(octave) - 4) * 12) / 12);
}

export const env = {
  /** Linear attack, exponential decay with time constant `decay`. */
  perc: (attack, decay) => `if(lt(t,${num(attack)}),t/${num(attack)},exp(-(t-${num(attack)})/${num(decay)}))`,
  /** Linear attack, flat hold, linear release. */
  hold(attack, length, release) {
    const end = attack + length;
    return `if(lt(t,${num(attack)}),t/${num(attack)},if(lt(t,${num(end)}),1,max(0,1-(t-${num(end)})/${num(release)})))`;
  },
  /** Smooth rise and fall over `length`. */
  swell: (length) => `pow(sin(PI*min(t/${num(length)},1)),2)`,
};

const partial = (k, weight, phase) =>
  `${num(weight)}*sin(${num(2 * Math.PI * k)}*${phase})*lt(${k}*ld(7),${PARTIAL_LIMIT_HZ})`;

/** A harmonic spectrum from per-harmonic weights (index 0 = fundamental), RMS-normalised. */
export function additive(weights) {
  const norm = Math.sqrt(weights.reduce((sum, weight) => sum + weight * weight, 0));
  return (phase) => `(${weights
    .map((weight, index) => (weight === 0 ? null : partial(index + 1, weight / norm, phase)))
    .filter(Boolean)
    .join('+')})`;
}

const alternating = (k) => (((k - 1) / 2) % 2 === 0 ? 1 : -1);

export const wave = {
  sine: (phase) => `sin(2*PI*${phase})`,
  saw: (count = 24) => additive(range(count).map((k) => 1 / k)),
  square: (count = 24) => additive(range(count).map((k) => (k % 2 ? 1 / k : 0))),
  triangle: (count = 9) => additive(range(count).map((k) => (k % 2 ? alternating(k) / (k * k) : 0))),
  /** Brightness (register 9, 0..0.9) sets how slowly upper harmonics fall off: mellow to brassy. */
  brass: (count = 22) => (phase) => `(${range(count)
    .map((k) => `pow(ld(9),${k - 1})*sin(${num(2 * Math.PI * k)}*${phase})*lt(${k}*ld(7),${PARTIAL_LIMIT_HZ})`)
    .join('+')})*sqrt(1-ld(9)*ld(9))`,
};

function layer({ setup = [], body, dur, at = 0, gain = 1, filters = [] }) {
  // Fades the last few milliseconds so a layer never ends on a click.
  const declick = `min(1,(${num(dur)}-t)/${num(DECLICK_SECONDS)})`;
  return { expr: [...setup, `(${body})*${declick}`].join(';'), dur, at, gain, filters };
}

/** An oscillator; `freq` and `brightness` may be expressions of t. */
export function tone({ freq, wave: shape = wave.sine, env: envelope = '1', brightness, ...rest }) {
  const setup = [`st(7,${term(freq)})`, `st(0,ld(0)+ld(7)/${SAMPLE_RATE})`];
  if (brightness !== undefined) setup.push(`st(9,${term(brightness)})`);
  return layer({ setup, body: `(${envelope})*${shape('ld(0)')}`, ...rest });
}

export const vowels = {
  a: [800, 1200, 2700],
  e: [500, 1800, 2600],
  o: [480, 850, 2500],
  u: [330, 800, 2400],
  uh: [640, 1190, 2390],
};

/**
 * A wordless vocal sound: a harmonic source whose partials are weighted by three formant peaks.
 * f0 and each formant may be expressions of t, which is how vowels glide.
 */
export function voice({ f0, formants, env: envelope = '1', count = 36, ...rest }) {
  const [f1, f2, f3] = formants;
  const setup = [
    `st(7,${term(f0)})`,
    `st(0,ld(0)+ld(7)/${SAMPLE_RATE})`,
    `st(8,${term(f1)})`,
    `st(9,${term(f2)})`,
    `st(6,${term(f3)})`,
    `st(5,max(90,0.7*ld(7)))`,
  ];
  const peak = (register, width, weight, k) =>
    `${num(weight)}*exp(-pow((${k}*ld(7)-ld(${register}))/(${num(width)}*ld(5)),2))`;
  const partials = range(count).map((k) => {
    const weight = [peak(8, 1, 1, k), peak(9, 1.4, 0.6, k), peak(6, 2, 0.35, k), num(0.04 / k)].join('+');
    return `(${weight})*sin(${num(2 * Math.PI * k)}*ld(0))*lt(${k}*ld(7),${PARTIAL_LIMIT_HZ})`;
  });
  return layer({ setup, body: `(${envelope})*(${partials.join('+')})/2`, ...rest });
}

const seeded = (seed) => `if(eq(n,0),st(1,${seed})+st(4,${seed * 7 + 3}),0)`;

/** White noise; colour it with `filters`. */
export function noise({ seed = 1, env: envelope = '1', ...rest }) {
  return layer({ setup: [seeded(seed)], body: `(${envelope})*(2*random(1)-1)`, ...rest });
}

/** Noise through a band-pass filter whose centre (an expression of t) moves: whooshes, crowds. */
export function sweep({ seed = 1, center, damping = 0.4, env: envelope = '1', ...rest }) {
  // Chamberlin state-variable filter: register 2 = low-pass, 3 = band-pass.
  const setup = [
    seeded(seed),
    `st(5,2*sin(PI*min(${term(center)},6000)/${SAMPLE_RATE}))`,
    `st(2,ld(2)+ld(5)*ld(3))`,
    `st(6,2*random(1)-1-ld(2)-${num(damping)}*ld(3))`,
    `st(3,ld(3)+ld(5)*ld(6))`,
  ];
  return layer({ setup, body: `(${envelope})*ld(3)*${num(damping)}`, ...rest });
}

/** Randomly timed short noise bursts (`rate` per second): claps, coins, sputter, debris. */
export function crackle({ seed = 1, rate, decay, env: envelope = '1', ...rest }) {
  const keep = Math.exp(-1 / (decay * SAMPLE_RATE));
  const setup = [seeded(seed), `st(2,if(lt(random(1),${num(rate / SAMPLE_RATE)}),1,ld(2)*${num(keep)}))`];
  return layer({ setup, body: `(${envelope})*ld(2)*(2*random(4)-1)`, ...rest });
}

/** Places a phrase of [note | null, seconds] steps; `build({ note, at, len })` returns its layers. */
export function melody(steps, build, start = 0) {
  const layers = [];
  let at = start;
  for (const [note, len] of steps) {
    if (note) layers.push(build({ note, at, len }));
    at += len;
  }
  return layers;
}

/** A small multi-tap echo standing in for a room; `amount` 0..0.5. */
export function room(amount) {
  const delays = [31, 53, 79, 113, 167, 241, 337];
  const decays = delays.map((_, index) => num(amount * 0.82 ** index));
  return `aecho=1:1:${delays.join('|')}:${decays.join('|')}`;
}

/** Gentle overdrive for horns and buzzers. */
export const SATURATE = ['volume=2', 'asoftclip=type=tanh'];

export const ENSEMBLE ='chorus=0.7:0.9:27|41|57:0.35|0.3|0.25:0.3|0.45|0.35:1.6|2.1|1.8';
