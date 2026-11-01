/** Reusable instruments built from the sound-synth layers. Each returns one layer or an array. */
import { env, hz, noise, num, tone, wave } from './sound-synth.mjs';

const BELL_PARTIALS = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 2, gain: 0.45, decay: 0.6 },
  { ratio: 2.76, gain: 0.35, decay: 0.45 },
  { ratio: 5.4, gain: 0.12, decay: 0.25 },
];

/** A brass note with a lip scoop at the onset and late vibrato. */
export function brassNote({ note, at = 0, len, gain = 0.5, detune = 1, brightness, release = 0.08 }) {
  const freq = num(hz(note) * detune);
  return tone({
    freq: `${freq}*(1-0.03*exp(-t/0.025))*(1+0.004*sin(2*PI*5.5*t)*min(t/0.3,1))`,
    wave: wave.brass(22),
    brightness: brightness ?? '0.3+0.45*min(t/0.04,1)-0.15*min(t/0.6,1)',
    env: env.hold(0.015, len * 0.85, release),
    dur: len + release + 0.05,
    at,
    gain,
    filters: ['lowpass=f=6500'],
  });
}

/** A struck bell: inharmonic partials, each decaying faster than the one below. */
export function bellNote({ note, at = 0, decay = 0.5, gain = 0.4, partials = BELL_PARTIALS.length }) {
  const freq = hz(note);
  return BELL_PARTIALS.slice(0, partials).map((part) => tone({
    freq: freq * part.ratio,
    env: env.perc(0.002, decay * part.decay),
    dur: 0.01 + decay * part.decay * 6,
    at,
    gain: gain * part.gain,
  }));
}

/** A timpani stroke: pitch settles after the hit, with a soft mallet click. */
export function timpani({ note, at = 0, gain = 0.8 }) {
  const freq = num(hz(note));
  return [
    tone({ freq: `${freq}*(1+0.12*exp(-t/0.04))`, env: env.perc(0.003, 0.45), dur: 2, at, gain }),
    tone({ freq: `${freq}*1.5*(1+0.1*exp(-t/0.04))`, env: env.perc(0.003, 0.2), dur: 1, at, gain: gain * 0.3 }),
    noise({ seed: 17, env: env.perc(0.001, 0.02), dur: 0.15, at, gain: gain * 0.3, filters: ['lowpass=f=1200'] }),
  ];
}

/** A crash cymbal: bright noise with a few metallic partials. */
export function cymbal({ at = 0, decay = 0.6, gain = 0.4, seed = 29 }) {
  const metal = [3150, 4420, 5870, 7300].map((freq) => tone({
    freq,
    env: env.perc(0.002, decay * 0.6),
    dur: decay * 4,
    at,
    gain: gain * 0.12,
  }));
  return [
    noise({ seed, env: env.perc(0.002, decay), dur: decay * 6, at, gain, filters: ['highpass=f=4500'] }),
    ...metal,
  ];
}
