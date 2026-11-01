/** Sounds for winning a trick, a round or the game. */
import { bellNote, brassNote, cymbal, timpani } from './sound-instruments.mjs';
import { ENSEMBLE, crackle, env, hz, melody, noise, num, room, sweep, tone, voice, vowels, wave } from './sound-synth.mjs';

const VOWEL_CYCLE = [vowels.a, vowels.o, vowels.e];

function pad({ notes, at = 0, envelope, dur, gain = 0.08 }) {
  return notes.map((note) => tone({
    freq: `${num(hz(note))}*(1+0.003*sin(2*PI*5*t))`,
    wave: wave.saw(30),
    env: envelope,
    dur,
    at,
    gain,
    filters: ['lowpass=f=3000'],
  }));
}

export const TRICK_WIN_DESIGNS = [
  {
    name: 'victory-fanfare',
    dur: 1.2,
    layers: [
      melody([['C5', 0.1], ['E5', 0.1], ['G5', 0.1], ['C6', 0.6]], ({ note, at, len }) => brassNote({ note, at, len: len * 0.9 })),
      brassNote({ note: 'G5', at: 0.3, len: 0.54, gain: 0.3 }),
      timpani({ note: 'C3', at: 0.3, gain: 0.6 }),
    ],
    post: [room(0.25)],
  },
  {
    name: 'evil-laugh',
    dur: 1.7,
    layers: [
      voice({
        f0: '(130-25*min(t/1.3,1))*(1+0.04*sin(2*PI*5*t))',
        formants: [750, 1150, 2600],
        // Five short "ha"s, then a long one; max() keeps pow() away from negative bases (NaN).
        env: 'lt(t,1)*pow(max(0,sin(PI*mod(t,0.2)/0.14)),0.5)*lt(mod(t,0.2),0.14)+gte(t,1)*lt(t,1.55)*sin(PI*(t-1)/0.55)',
        dur: 1.6,
        count: 40,
      }),
      noise({
        seed: 81,
        env: 'lt(t,1)*lt(mod(t,0.2),0.05)*(1-mod(t,0.2)/0.05)+gte(t,1)*lt(t,1.05)*(1-(t-1)/0.05)',
        dur: 1.1,
        gain: 0.25,
        filters: ['bandpass=f=1500:t=h:w=2000'],
      }),
    ],
    post: ['volume=1.5', 'asoftclip=type=tanh', room(0.35)],
  },
  {
    name: 'cash-register',
    dur: 1.3,
    layers: [
      noise({ seed: 91, env: env.perc(0.0005, 0.02), dur: 0.15, gain: 0.8, filters: ['lowpass=f=2000'] }),
      tone({ freq: 120, env: env.perc(0.001, 0.05), dur: 0.3, gain: 0.6 }),
      noise({ seed: 92, env: env.hold(0.01, 0.1, 0.05), dur: 0.17, at: 0.05, gain: 0.3, filters: ['bandpass=f=1200:t=h:w=800'] }),
      bellNote({ note: 'C7', at: 0.12, decay: 0.6 }),
      bellNote({ note: 'E7', at: 0.2, decay: 0.7 }),
      crackle({ seed: 93, rate: 40, decay: 0.006, env: env.perc(0.01, 0.25), dur: 0.9, at: 0.15, gain: 0.3, filters: ['highpass=f=4000'] }),
    ],
    post: [room(0.15)],
  },
  {
    name: 'tada',
    dur: 1.6,
    layers: [
      ['G4', 'B4', 'D5', 'G5'].map((note) => brassNote({ note, len: 0.1, gain: 0.3 })),
      ['C5', 'E5', 'G5', 'C6'].map((note) => brassNote({ note, at: 0.16, len: 1, gain: 0.3 })),
      cymbal({ at: 0.16, decay: 0.5, gain: 0.25 }),
      bellNote({ note: 'C7', at: 0.2, decay: 0.3, gain: 0.15, partials: 3 }),
    ],
    post: [room(0.3)],
  },
  {
    name: 'choir',
    dur: 2.4,
    layers: ['F4', 'A4', 'C5', 'F5'].map((note, index) => voice({
      f0: `${num(hz(note))}*(1+0.006*sin(2*PI*${num(5 + index * 0.3)}*t+${index}))`,
      formants: index % 2 ? [700, 1100, 2700] : vowels.a,
      env: env.hold(0.35, 1.3, 0.6),
      dur: 2.3,
      gain: 0.4,
      count: 24,
    })),
    post: [ENSEMBLE, room(0.5)],
  },
  {
    name: 'glory-horn',
    dur: 1.9,
    layers: [1, 0.5].map((ratio, index) => [
      brassNote({ note: hz('C4') * ratio, len: 0.35, gain: index === 0 ? 0.5 : 0.3 }),
      brassNote({ note: hz('G4') * ratio, at: 0.35, len: 1.2, gain: index === 0 ? 0.5 : 0.3, brightness: '0.25+0.5*min(t/1,1)', release: 0.25 }),
    ]),
    post: [room(0.4)],
  },
  {
    name: 'jackpot',
    dur: 1.7,
    layers: [
      Array.from({ length: 15 }, (_, index) =>
        bellNote({ note: index % 2 ? 'G6' : 'E6', at: index * 0.07, decay: 0.12, gain: 0.35, partials: 3 })),
      crackle({ seed: 101, rate: 30, decay: 0.008, env: env.hold(0.05, 1, 0.3), dur: 1.4, gain: 0.35, filters: ['highpass=f=3500'] }),
      ['C7', 'E7', 'G7'].map((note) => bellNote({ note, at: 1.05, decay: 0.5, gain: 0.3, partials: 3 })),
    ],
    post: [room(0.2)],
  },
  {
    name: 'drumroll',
    dur: 2.6,
    layers: [
      noise({
        seed: 111,
        env: '(0.25+0.75*min(t/1.05,1))*exp(-mod(t,0.04)/0.012)',
        dur: 1.05,
        gain: 0.8,
        filters: ['bandpass=f=3500:t=h:w=5000'],
      }),
      tone({ freq: 190, env: '(0.25+0.75*min(t/1.05,1))*exp(-mod(t,0.04)/0.012)', dur: 1.05, gain: 0.3 }),
      cymbal({ at: 1.05, decay: 0.6, gain: 0.7, seed: 112 }),
      tone({ freq: '55*(1+1.5*exp(-t/0.03))', env: env.perc(0.002, 0.18), dur: 1, at: 1.05 }),
    ],
    post: [room(0.25)],
  },
  {
    name: 'coin',
    dur: 0.8,
    layers: [
      ['G6', 'C7', 'G7'].map((note, index) =>
        tone({ freq: hz(note), wave: wave.triangle(5), env: env.perc(0.002, 0.15), dur: 0.6, at: index * 0.06, gain: 0.6 })),
      bellNote({ note: 'G7', at: 0.12, decay: 0.4, gain: 0.15, partials: 3 }),
    ],
    post: [room(0.2)],
  },
];

const CLAP_CENTERS = [1200, 1400, 1550, 1700, 1850, 2000, 2150, 2300, 2450, 2600];

export const ROUND_WIN_DESIGNS = [
  {
    name: 'applause',
    dur: 3.2,
    layers: [
      CLAP_CENTERS.map((center, index) => crackle({
        seed: 120 + index,
        rate: 4.5,
        decay: 0.009,
        env: env.hold(0.4, 1.8, 0.9),
        dur: 3.2,
        gain: 0.3,
        filters: [`bandpass=f=${center}:t=h:w=2500`],
      })),
      noise({ seed: 130, env: env.hold(0.4, 1.8, 0.9), dur: 3.2, gain: 0.04, filters: ['bandpass=f=1500:t=h:w=2000'] }),
    ],
    post: [room(0.2)],
  },
  {
    name: 'cheer',
    dur: 3.2,
    layers: [
      sweep({ seed: 131, center: '900+250*sin(2*PI*0.7*t)', damping: 0.6, env: env.hold(0.5, 1.7, 0.9), dur: 3.2, gain: 0.5 }),
      sweep({ seed: 132, center: '2300+400*sin(2*PI*0.5*t+1)', damping: 0.7, env: env.hold(0.5, 1.7, 0.9), dur: 3.2, gain: 0.3 }),
      [210, 245, 290, 330, 380, 440].map((base, index) => voice({
        f0: `${base}*(1+0.25*min(t/0.4,1))*(1+0.02*sin(2*PI*${4 + index}*t))`,
        formants: VOWEL_CYCLE[index % VOWEL_CYCLE.length],
        env: env.hold(0.15 + index * 0.08, 1.4, 0.8),
        dur: 3,
        at: index * 0.06,
        gain: 0.18,
        count: 20,
      })),
      tone({ freq: '2600*(1+0.15*min(t/0.25,1))*(1+0.01*sin(2*PI*8*t))', env: env.hold(0.03, 0.5, 0.1), dur: 0.7, at: 0.4, gain: 0.15 }),
    ],
    post: [ENSEMBLE, room(0.35)],
  },
];

export const GAME_WIN_DESIGNS = [
  {
    name: 'champion',
    dur: 3.3,
    layers: [
      melody([['G4', 0.18], ['C5', 0.18], ['E5', 0.36], ['D5', 0.18], ['C5', 0.18], ['E5', 0.18], ['G5', 1.3]],
        ({ note, at, len }) => brassNote({ note, at, len: len * 0.9, release: note === 'G5' ? 0.4 : 0.08 })),
      ['E5', 'C5'].map((note) => brassNote({ note, at: 1.26, len: 1.17, gain: 0.3, release: 0.4 })),
      pad({ notes: ['C4', 'E4', 'G4'], envelope: env.hold(0.6, 2, 0.7), dur: 3.3 }),
      timpani({ note: 'C3', gain: 0.6 }),
      timpani({ note: 'G2', at: 0.36, gain: 0.5 }),
      timpani({ note: 'C3', at: 1.26, gain: 0.8 }),
      cymbal({ at: 1.26, decay: 0.8, gain: 0.3 }),
    ],
    post: [room(0.4)],
  },
  {
    name: 'triumph',
    dur: 3,
    layers: [
      noise({ seed: 141, env: 'pow(min(t/1,1),2)', dur: 1, gain: 0.4, filters: ['highpass=f=5000'] }),
      pad({ notes: ['F3', 'C4', 'F4', 'A4'], envelope: 'pow(min(t/1,1),2)', dur: 1, gain: 0.1 }),
      ['C4', 'E4', 'G4', 'C5', 'E5'].map((note) =>
        brassNote({ note, at: 1, len: 1.4, gain: 0.3, brightness: '0.7-0.3*min(t/1.2,1)', release: 0.4 })),
      timpani({ note: 'C3', at: 1, gain: 0.9 }),
      cymbal({ at: 1, decay: 0.8, gain: 0.5, seed: 142 }),
      ['C7', 'D7', 'E7', 'G7', 'A7', 'C8'].map((note, index) =>
        bellNote({ note, at: 1.15 + index * 0.08, decay: 0.2, gain: 0.15, partials: 3 })),
    ],
    post: [room(0.45)],
  },
];
