/** Sounds a player picks for playing a Jester: comic fails and letdowns. */
import { ENSEMBLE, SATURATE, additive, env, hz, melody, noise, num, room, tone, voice, wave } from './sound-synth.mjs';

const trombone = ({ note, at, len, last }) => tone({
  freq: last
    ? `${num(hz(note))}*(1+0.02*sin(2*PI*5*t)*min(t/0.3,1))`
    : `${num(hz(note))}*(1-0.02*min(max(t-${num(len * 0.7)},0)/${num(len * 0.3)},1))`,
  wave: wave.brass(20),
  brightness: `0.15+0.45*sin(PI*min(t/${num(len)},1))`,
  env: env.hold(0.03, len * 0.85, 0.12),
  dur: len + 0.15,
  at,
  filters: ['lowpass=f=3500'],
});

const squeak = (at) => [
  tone({ freq: '1050+350*sin(PI*min(t/0.15,1))', wave: additive([1, 0.5, 0.35, 0.2, 0.1]), env: env.hold(0.01, 0.13, 0.03), dur: 0.18, at }),
  noise({ seed: 41, env: env.hold(0.01, 0.13, 0.03), dur: 0.18, at, gain: 0.12, filters: ['bandpass=f=2500:t=h:w=1500'] }),
];

const BASSOON = additive([1, 0.6, 0.8, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1]);

export const JESTER_DESIGNS = [
  {
    name: 'sad-trombone',
    dur: 2.5,
    layers: melody([['D4', 0.38], ['C#4', 0.38], ['C4', 0.38], ['B3', 1.1]],
      ({ note, at, len }) => trombone({ note, at, len, last: note === 'B3' })),
    post: [room(0.2)],
  },
  {
    name: 'bonk',
    dur: 0.5,
    layers: [
      tone({ freq: '780*(1-0.35*min(t/0.04,1))', env: env.perc(0.001, 0.05), dur: 0.4, gain: 0.9 }),
      tone({ freq: 1795, env: env.perc(0.001, 0.025), dur: 0.2, gain: 0.4 }),
      tone({ freq: '260*(1-0.3*min(t/0.12,1))', wave: wave.triangle(7), env: env.perc(0.002, 0.11), dur: 0.5, gain: 0.7 }),
      noise({ seed: 31, env: env.perc(0.0003, 0.006), dur: 0.05, gain: 0.5, filters: ['bandpass=f=3000:t=h:w=2500'] }),
    ],
    post: [room(0.1)],
  },
  {
    name: 'slip',
    dur: 1,
    layers: [
      tone({ freq: '(500+1600*pow(min(t/0.32,1),1.5))*(1+0.01*sin(2*PI*12*t))', env: env.hold(0.02, 0.3, 0.05), dur: 0.4 }),
      tone({ freq: '110*(1+0.5*exp(-t/0.03))', env: env.perc(0.002, 0.12), dur: 0.45, at: 0.5 }),
      noise({ seed: 32, env: env.perc(0.001, 0.04), dur: 0.2, at: 0.5, gain: 0.6, filters: ['lowpass=f=800'] }),
    ],
    post: [room(0.12)],
  },
  {
    name: 'whomp',
    dur: 1.1,
    layers: melody([['G3', 0.35], ['D3', 0.65]], ({ note, at, len }) => tone({
      freq: `${num(hz(note))}*(1-0.05*min(t/${num(len)},1))`,
      wave: wave.brass(25),
      brightness: `0.2+0.55*sin(PI*min(t/${num(Math.min(len, 0.3))},1))`,
      env: env.hold(0.02, len * 0.8, 0.1),
      dur: len + 0.1,
      at,
      filters: ['lowpass=f=2500'],
    })),
    post: ['volume=1.5', 'asoftclip=type=tanh', room(0.15)],
  },
  {
    name: 'sad-violin',
    dur: 2.9,
    layers: [['A5', 'G5', 'F5', 'E5'], ['F5', 'E5', 'D5', 'C#5']].map((line, index) => melody(
      line.map((note, step) => [note, [0.55, 0.3, 0.3, 1.4][step]]),
      ({ note, at, len }) => tone({
        freq: `${num(hz(note))}*(1+0.008*sin(2*PI*5.8*t)*min(t/0.25,1))`,
        wave: wave.saw(30),
        env: env.hold(0.12, len * 0.9, 0.2),
        dur: len + 0.25,
        at,
        gain: index === 0 ? 0.6 : 0.25,
        filters: ['highpass=f=300', 'lowpass=f=5000', 'equalizer=f=3000:t=q:w=1:g=5'],
      })
    )),
    post: [ENSEMBLE, room(0.4)],
  },
  {
    name: 'clown-horn',
    dur: 0.7,
    layers: [0, 0.28].map((at) => [1, 1.01].map((detune, index) => tone({
      freq: `${num(640 * detune)}*(1+0.06*sin(PI*min(t/0.22,1)))`,
      wave: wave.square(14),
      env: env.hold(0.008, 0.18, 0.04),
      dur: 0.24,
      at,
      gain: index === 0 ? 1 : 0.6,
      filters: ['bandpass=f=1400:t=h:w=1600'],
    }))),
    post: SATURATE,
  },
  {
    name: 'game-over',
    dur: 2.3,
    layers: [
      melody([['C5', 0.2], ['G4', 0.2], ['Eb4', 0.2], ['C4', 1.4]], ({ note, at, len }) => [1, 0.5].map((ratio) => tone({
        freq: `${num(hz(note) * ratio)}*(1+0.008*sin(2*PI*5*t)*min(t/0.4,1))`,
        wave: ratio === 1 ? wave.triangle(9) : wave.square(9),
        env: env.hold(0.005, Math.min(len, 0.6), len > 1 ? 0.6 : 0.15),
        dur: len + 0.1,
        at,
        gain: ratio === 1 ? 0.7 : 0.2,
      }))),
      tone({ freq: '65*(1+0.3*exp(-t/0.05))', env: env.perc(0.003, 0.4), dur: 1.6, at: 0.6, gain: 0.8 }),
    ],
    post: [room(0.3)],
  },
  {
    name: 'wrong-buzzer',
    dur: 1,
    layers: [[0, 0.22], [0.3, 0.6]].map(([at, len]) => [
      tone({ freq: 147, wave: wave.saw(40), env: env.hold(0.005, len, 0.03), dur: len + 0.05, at, gain: 0.6 }),
      tone({ freq: 152, wave: wave.square(40), env: env.hold(0.005, len, 0.03), dur: len + 0.05, at, gain: 0.6 }),
    ]),
    post: ['highpass=f=150', 'lowpass=f=3000', 'volume=2.5', 'asoftclip=type=tanh'],
  },
  {
    name: 'awkward-tune',
    dur: 2.4,
    layers: [
      melody(
        [['D3', 0.16], [null, 0.16], ['F3', 0.16], ['E3', 0.16], [null, 0.16], ['C#3', 0.16], ['D3', 0.16],
          [null, 0.16], ['A2', 0.32], [null, 0.16], ['D3', 0.16]],
        ({ note, at, len }) => tone({ freq: hz(note), wave: BASSOON, env: env.hold(0.01, len * 0.55, 0.05), dur: len, at, filters: ['lowpass=f=2500'] })
      ),
      melody([[null, 0.16], ['A4', 0.48], ['G4', 0.32], ['F4', 0.64], ['A4', 0.16]], ({ note, at }) =>
        tone({ freq: hz(note), wave: wave.triangle(7), env: env.perc(0.002, 0.08), dur: 0.5, at, gain: 0.3 })),
    ],
    post: [room(0.15)],
  },
  {
    name: 'error-beep',
    dur: 0.7,
    layers: [[0, 740, 0.09, 0.03], [0.14, 494, 0.25, 0.12]].map(([at, freq, len, release]) => tone({
      freq,
      wave: additive([1, 0, 0.3, 0, 0.1]),
      env: env.hold(0.004, len, release),
      dur: len + release + 0.02,
      at,
    })),
    post: ['lowpass=f=3000', room(0.1)],
  },
  { name: 'rubber-duck', dur: 0.6, layers: [squeak(0), squeak(0.26)] },
  {
    name: 'cartoon-boing',
    dur: 0.9,
    layers: [
      tone({ freq: '200+160*t+70*exp(-t/0.3)*sin(2*PI*14*t)', wave: additive([1, 0.4, 0.2]), env: env.perc(0.003, 0.3), dur: 0.9 }),
      tone({ freq: '2*(200+160*t+70*exp(-t/0.3)*sin(2*PI*14*t))', env: env.perc(0.003, 0.12), dur: 0.6, gain: 0.2 }),
    ],
  },
  {
    name: 'slap',
    dur: 0.75,
    layers: [
      noise({ seed: 51, env: env.perc(0.0003, 0.012), dur: 0.1, filters: ['bandpass=f=2200:t=h:w=2500'] }),
      noise({ seed: 52, env: env.perc(0.001, 0.045), dur: 0.3, gain: 0.8, filters: ['lowpass=f=600'] }),
      tone({ freq: 180, env: env.perc(0.001, 0.04), dur: 0.25, gain: 0.3 }),
      noise({ seed: 53, env: env.swell(0.4), dur: 0.4, at: 0.18, gain: 0.25, filters: ['bandpass=f=1000:t=h:w=800'] }),
      voice({ f0: '180-50*t/0.4', formants: [700, 1100, 2500], env: env.swell(0.4), dur: 0.4, at: 0.18, gain: 0.25 }),
    ],
    post: [room(0.15)],
  },
  {
    name: 'heavy-hit',
    dur: 1.4,
    layers: [
      tone({ freq: '45+110*exp(-t/0.04)', env: env.perc(0.001, 0.22), dur: 1.4, gain: 1.2 }),
      noise({ seed: 61, env: env.perc(0.0005, 0.05), dur: 0.4, gain: 0.9, filters: ['bandpass=f=900:t=h:w=1200'] }),
      [311, 487, 733, 1109, 1597].map((freq, index) =>
        tone({ freq, env: env.perc(0.002, 0.35 / (index + 1)), dur: 1.2, gain: 0.18 })),
    ],
    post: ['volume=2.2', 'asoftclip=type=tanh', room(0.3)],
  },
  {
    name: 'crickets',
    dur: 2.8,
    level: -4,
    layers: [
      tone({ freq: 4650, env: 'lt(mod(t,0.62),0.1)*pow(sin(PI*mod(t,0.033)/0.033),2)*min(t/0.05,1)', dur: 2.8, gain: 0.5 }),
      tone({ freq: 4310, env: 'lt(mod(t+0.27,0.71),0.1)*pow(sin(PI*mod(t+0.27,0.033)/0.033),2)', dur: 2.8, gain: 0.35 }),
      noise({ seed: 71, dur: 2.8, gain: 0.03, filters: ['lowpass=f=500'] }),
    ],
    post: [room(0.2)],
  },
];
