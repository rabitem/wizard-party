/** Sounds a player picks for playing a Wizard: fanfares, magic and big impacts. */
import { bellNote, brassNote, timpani } from './sound-instruments.mjs';
import {
  SATURATE, crackle, env, hz, melody, noise, num, room, sweep, tone, voice, vowels, wave,
} from './sound-synth.mjs';

function blast({ at, len, freqs, gain = 0.5 }) {
  return freqs.map((freq) => tone({
    freq: `${num(freq)}*(1-0.04*exp(-t/0.03))`,
    wave: wave.saw(30),
    env: env.hold(0.015, len, 0.06),
    dur: len + 0.1,
    at,
    gain,
  }));
}

export const WIZARD_DESIGNS = [
  {
    name: 'bass-drop',
    dur: 1.6,
    layers: [
      tone({ freq: '45+90*exp(-t/0.1)', env: env.perc(0.002, 0.45), dur: 1.6 }),
      // Overtones keep the drop audible on phone speakers that cannot reproduce the fundamental.
      tone({ freq: '2*(45+90*exp(-t/0.1))', env: env.perc(0.002, 0.3), dur: 1.2, gain: 0.5 }),
      tone({ freq: '3*(45+90*exp(-t/0.1))', env: env.perc(0.002, 0.15), dur: 0.8, gain: 0.2 }),
      noise({ seed: 3, env: env.perc(0.0005, 0.012), dur: 0.1, gain: 0.5, filters: ['lowpass=f=2500'] }),
    ],
    post: ['volume=2.5', 'asoftclip=type=tanh', room(0.25)],
  },
  {
    name: 'party-horn',
    dur: 1.1,
    layers: [
      tone({
        freq: 'if(lt(t,0.12),310+130*t/0.12,440)*(1+0.012*sin(2*PI*9*t))',
        wave: wave.saw(30),
        env: env.hold(0.02, 0.8, 0.15),
        dur: 1.05,
        filters: ['highpass=f=350', 'lowpass=f=4500'],
      }),
      noise({ seed: 5, env: env.hold(0.01, 0.8, 0.15), dur: 1.05, gain: 0.12, filters: ['bandpass=f=3000:t=h:w=2000'] }),
      crackle({ seed: 9, rate: 60, decay: 0.004, env: env.hold(0.001, 0.15, 0.05), dur: 0.3, gain: 0.4, filters: ['highpass=f=2500'] }),
    ],
  },
  {
    name: 'airhorn',
    dur: 1.6,
    layers: [
      blast({ at: 0, len: 0.18, freqs: [425, 431, 538] }),
      blast({ at: 0.26, len: 0.18, freqs: [425, 431, 538] }),
      blast({ at: 0.52, len: 0.95, freqs: [425, 431, 538] }),
    ],
    post: ['volume=3', 'asoftclip=type=tanh', 'highpass=f=250', 'lowpass=f=7000', room(0.15)],
  },
  {
    name: 'oof',
    dur: 0.55,
    layers: [
      voice({
        f0: '150-50*min(t/0.35,1)',
        formants: ['450-120*min(t/0.12,1)', '900-150*min(t/0.12,1)', 2400],
        env: env.hold(0.015, 0.16, 0.22),
        dur: 0.5,
        count: 40,
      }),
      noise({ seed: 7, env: env.perc(0.005, 0.06), dur: 0.3, gain: 0.15, filters: ['bandpass=f=1200:t=h:w=1500'] }),
      tone({ freq: 90, env: env.perc(0.002, 0.07), dur: 0.4, gain: 0.5 }),
    ],
    post: ['asoftclip=type=tanh'],
  },
  {
    name: 'wow',
    dur: 0.95,
    layers: [
      voice({
        f0: '170+70*sin(PI*min(t/0.75,1))',
        formants: ['320+460*sin(PI*min(t/0.7,1))', '650+600*sin(PI*min(t/0.7,1))', 2600],
        env: env.hold(0.04, 0.55, 0.2),
        dur: 0.9,
      }),
    ],
    post: [room(0.15)],
  },
  {
    name: 'honk',
    dur: 0.75,
    layers: [0, 0.33].map((at) => voice({
      f0: '360-60*t/0.26',
      formants: [700, 1500, 2900],
      env: env.hold(0.01, 0.17, 0.07),
      dur: 0.3,
      at,
      count: 30,
    })),
    post: SATURATE,
  },
  {
    name: 'toot',
    dur: 0.8,
    layers: [
      tone({
        freq: '85+18*sin(2*PI*6*t)+10*sin(2*PI*23*t)',
        wave: wave.saw(40),
        env: env.hold(0.02, 0.5, 0.2),
        dur: 0.75,
        filters: ['lowpass=f=700'],
      }),
      crackle({ seed: 4, rate: 80, decay: 0.003, env: env.hold(0.02, 0.5, 0.2), dur: 0.75, gain: 0.3, filters: ['lowpass=f=600'] }),
    ],
    post: SATURATE,
  },
  {
    name: 'magic-sparkle',
    dur: 1.8,
    layers: [
      ['E6', 'G6', 'A6', 'C7', 'D7', 'E7', 'G7', 'A7', 'C8', 'D7', 'G7', 'E8'].map((note, index) =>
        bellNote({ note, at: index * 0.075, decay: 0.15, gain: 0.35, partials: 3 })),
      noise({ seed: 11, env: env.swell(1.2), dur: 1.2, gain: 0.05, filters: ['highpass=f=7000'] }),
    ],
    post: [room(0.35)],
  },
  {
    name: 'level-up',
    dur: 1.05,
    layers: [
      melody([['G4', 0.07], ['C5', 0.07], ['E5', 0.07], ['G5', 0.07], ['C6', 0.07]], ({ note, at }) =>
        tone({ freq: hz(note), wave: wave.square(15), env: env.hold(0.003, 0.05, 0.02), dur: 0.08, at, gain: 0.5 })),
      tone({ freq: `${num(hz('C6'))}*(1+0.006*sin(2*PI*7*t))`, wave: wave.square(9), env: env.hold(0.005, 0.35, 0.2), dur: 0.6, at: 0.35, gain: 0.5 }),
      tone({ freq: hz('G5'), wave: wave.square(11), env: env.hold(0.005, 0.35, 0.2), dur: 0.6, at: 0.35, gain: 0.25 }),
    ],
    post: ['lowpass=f=6000', room(0.12)],
  },
  {
    name: 'power-up',
    dur: 0.9,
    layers: [1, 1.5].map((ratio, index) => tone({
      freq: `${ratio}*220*pow(2,3*min(t/0.65,1))`,
      wave: wave.triangle(9),
      env: `(${env.hold(0.01, 0.7, 0.15)})*(0.65+0.35*sin(2*PI*22*t))`,
      dur: 0.88,
      gain: index === 0 ? 1 : 0.4,
    })),
    post: ['lowpass=f=7000', room(0.15)],
  },
  {
    name: 'trumpet-call',
    dur: 2,
    layers: [1, 1.004].map((detune, index) => melody(
      [['F4', 0.13], ['F4', 0.13], ['Bb4', 0.32], ['D5', 0.15], ['C5', 0.15], ['F5', 0.7]],
      ({ note, at, len }) => brassNote({ note, at, len: len * 0.9, detune, gain: index === 0 ? 0.5 : 0.3 })
    )),
    post: [room(0.3)],
  },
  {
    name: 'dramatic-sting',
    dur: 2.3,
    layers: [
      ['C3', 'G3', 'C4', 'Eb4', 'G4'].map((note) => tone({
        freq: hz(note),
        wave: wave.brass(18),
        brightness: '0.75-0.35*min(t/0.4,1)',
        env: env.perc(0.01, 0.5),
        dur: 2.2,
        gain: 0.35,
      })),
      ['C4', 'Eb4', 'G4', 'C5'].map((note) => tone({
        freq: `${num(hz(note))}*(1+0.004*sin(2*PI*5*t))`,
        wave: wave.saw(30),
        env: `(${env.hold(0.1, 1.2, 0.6)})*(0.6+0.4*sin(2*PI*13*t))`,
        dur: 2,
        gain: 0.15,
        filters: ['lowpass=f=3500'],
      })),
      timpani({ note: 'C2', gain: 0.9 }),
    ],
    post: [room(0.35)],
  },
  {
    name: 'whoosh',
    dur: 0.95,
    layers: [
      sweep({ seed: 6, center: '300+3700*pow(sin(PI*min(t/0.8,1)),2)', damping: 0.5, env: env.swell(0.8), dur: 0.85 }),
      sweep({ seed: 8, center: '480+5000*pow(sin(PI*min(t/0.8,1)),2)', damping: 0.7, env: env.swell(0.8), dur: 0.85, gain: 0.5 }),
    ],
    post: [room(0.1)],
  },
  {
    name: 'scream',
    dur: 1.4,
    layers: [
      voice({
        f0: '(560-140*min(t/1.1,1))*(1+0.035*sin(2*PI*6.2*t))',
        formants: vowels.a,
        env: env.hold(0.06, 0.9, 0.35),
        dur: 1.35,
        count: 26,
      }),
      noise({ seed: 13, env: env.hold(0.05, 0.9, 0.3), dur: 1.3, gain: 0.12, filters: ['bandpass=f=2800:t=h:w=2500'] }),
    ],
    post: ['volume=1.8', 'asoftclip=type=tanh', room(0.25)],
  },
  {
    name: 'uh-oh',
    dur: 0.9,
    layers: [
      voice({ f0: '392*(1+0.01*sin(2*PI*5*t))', formants: vowels.uh, env: env.hold(0.02, 0.14, 0.05), dur: 0.25 }),
      voice({ f0: '311*(1-0.04*min(t/0.5,1))', formants: vowels.o, env: env.hold(0.03, 0.3, 0.2), dur: 0.6, at: 0.24 }),
    ],
    post: [room(0.15)],
  },
  {
    name: 'explosion',
    dur: 2.4,
    layers: [
      noise({ seed: 21, env: env.perc(0.0005, 0.02), dur: 0.2, gain: 0.6, filters: ['highpass=f=1500'] }),
      noise({ seed: 22, env: env.perc(0.004, 0.35), dur: 2, filters: ['lowpass=f=1200'] }),
      noise({ seed: 23, env: env.perc(0.02, 0.9), dur: 2.4, gain: 1.5, filters: ['lowpass=f=180', 'lowpass=f=180'] }),
      tone({ freq: '48*(1+0.4*exp(-t/0.08))', env: env.perc(0.003, 0.6), dur: 2.4, gain: 0.8 }),
      crackle({ seed: 24, rate: 25, decay: 0.01, env: 'exp(-t/0.6)', dur: 2.2, gain: 0.25, filters: ['bandpass=f=2500:t=h:w=3000'] }),
    ],
    post: ['volume=2.5', 'asoftclip=type=tanh', room(0.2)],
  },
  {
    name: 'royal-fanfare',
    dur: 2.4,
    layers: [
      melody([['C5', 0.16], ['C5', 0.08], ['E5', 0.16], ['G5', 0.16], ['E5', 0.12], ['G5', 0.9]],
        ({ note, at, len }) => brassNote({ note, at, len: len * 0.9 })),
      brassNote({ note: 'E5', at: 0.68, len: 0.81, gain: 0.3 }),
      brassNote({ note: 'C5', at: 0.68, len: 0.81, gain: 0.3 }),
      timpani({ note: 'C3', gain: 0.6 }),
      timpani({ note: 'G2', at: 0.68, gain: 0.8 }),
    ],
    post: [room(0.3)],
  },
];
