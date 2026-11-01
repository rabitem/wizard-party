import { Suit } from '@shared/domain';
import { CARD_THEMES, TABLE_THEMES, THEME_PRESETS } from '../settings';
import type { SandboxScenario, SandboxStep } from './sandbox.types';

export const finishTrick: SandboxStep[] = [
  { op: 'wait-for', until: 'trick-collected' },
  { op: 'wait-for', until: 'idle' },
];

export const playOnTurn = (via: SandboxStep & { op: 'play' } = { op: 'play' }): SandboxStep[] => [
  { op: 'wait-for', until: 'local-turn' },
  via,
];

/**
 * Animation sequences. Each one is a distinct ordering or interleaving of the game's
 * animations (opponent throws, local throw variants, landing, collection, hand
 * shuffle/sort, round and game transitions) under realistic server pacing and network
 * conditions. The audit matrix runs every scenario against every theme and collection mode.
 */
export const SANDBOX_SCENARIOS: readonly SandboxScenario[] = [
  {
    id: 'baseline-trick',
    title: 'Opponents throw, you play last, trick is collected',
    covers: ['opponent-throw', 'command-play', 'landing', 'table-shake', 'collection'],
    table: { leadSeat: 1 },
    steps: [...playOnTurn(), ...finishTrick],
  },
  {
    id: 'lead-drag-throw',
    title: 'You lead with a fast drag throw',
    covers: ['drag', 'local-throw', 'opponent-throw', 'collection'],
    table: { leadSeat: 0 },
    steps: [...playOnTurn({ op: 'play', via: 'drag-throw' }), ...finishTrick],
  },
  {
    id: 'slow-drop',
    title: 'You drag slowly into the play zone and let go',
    covers: ['drag', 'slow-drop', 'collection'],
    table: { leadSeat: 0 },
    steps: [...playOnTurn({ op: 'play', via: 'drag-slow' }), ...finishTrick],
  },
  {
    id: 'flick-play',
    title: 'You flick a card toward the table mid-trick',
    covers: ['drag', 'flick', 'opponent-throw', 'collection'],
    table: { leadSeat: 2 },
    steps: [...playOnTurn({ op: 'play', via: 'flick' }), ...finishTrick],
  },
  {
    id: 'double-tap-play',
    title: 'You double-tap to play',
    covers: ['double-tap', 'local-throw', 'collection'],
    table: { leadSeat: 3 },
    steps: [...playOnTurn({ op: 'play', via: 'double-tap' }), ...finishTrick],
  },
  {
    id: 'drag-cancel',
    title: 'You drag a card out, drop it back on the hand, then play another',
    covers: ['drag', 'drag-cancel', 'hand-return', 'command-play'],
    table: { leadSeat: 0 },
    steps: [
      { op: 'wait-for', until: 'local-turn' },
      { op: 'play', card: 'first', via: 'drag-cancel' },
      { op: 'wait', ms: 600 },
      { op: 'play', card: 'last' },
      ...finishTrick,
    ],
  },
  {
    id: 'drag-interrupted',
    title: 'A drag is interrupted by the system (pointercancel), then you play by double tap',
    covers: ['drag', 'pointer-cancel', 'hand-return', 'double-tap'],
    table: { leadSeat: 0 },
    steps: [
      { op: 'wait-for', until: 'local-turn' },
      { op: 'play', card: 'first', via: 'drag-interrupt' },
      { op: 'wait', ms: 600 },
      { op: 'play', card: 'last' },
      ...finishTrick,
    ],
  },
  {
    id: 'bot-burst',
    title: 'Every opponent card arrives in the same frame',
    covers: ['burst', 'play-sequencer', 'opponent-throw', 'collection'],
    table: { leadSeat: 0 },
    steps: [
      { op: 'bots', mode: 'manual' },
      ...playOnTurn(),
      { op: 'bot-play', count: 5 },
      ...finishTrick,
    ],
  },
  {
    id: 'back-to-back-tricks',
    title: 'A whole round at server pace; the next trick starts while the last is collected',
    covers: ['trick-overlap', 'collection', 'stacked-deck', 'round-end'],
    table: { round: 3, leadSeat: 1 },
    steps: [
      { op: 'repeat', times: 3, steps: playOnTurn({ op: 'play', card: 'random' }) },
      { op: 'wait-for', until: 'round-end' },
      { op: 'wait-for', until: 'idle' },
    ],
  },
  {
    id: 'shuffle-during-flight',
    title: 'Shuffle and sort the hand while opponent cards are in the air',
    covers: ['hand-shuffle', 'hand-sort', 'opponent-throw'],
    table: { leadSeat: 1, round: 5 },
    steps: [
      { op: 'wait', ms: 850 },
      { op: 'shuffle' },
      // A sort during a shuffle is dropped on purpose (the buttons are disabled), so sort after it.
      { op: 'wait-for', until: 'hand-idle' },
      { op: 'sort' },
      ...playOnTurn(),
      ...finishTrick,
    ],
  },
  {
    id: 'sort-during-collection',
    title: 'Sort the hand while the trick is being collected, shuffle right after',
    covers: ['hand-sort', 'hand-shuffle', 'collection'],
    table: { leadSeat: 1, round: 5 },
    steps: [
      ...playOnTurn(),
      { op: 'wait-for', until: 'collecting' },
      { op: 'sort' },
      { op: 'wait-for', until: 'trick-collected' },
      { op: 'shuffle' },
      { op: 'wait-for', until: 'hand-idle' },
      { op: 'wait-for', until: 'idle' },
    ],
  },
  {
    id: 'round-transition',
    title: 'Last trick of a round, round end, next round, bidding, first trick',
    covers: ['round-end', 'deck-reset', 'deal', 'bidding', 'collection'],
    table: { round: 1, leadSeat: 1 },
    steps: [
      ...playOnTurn(),
      { op: 'wait-for', until: 'round-end' },
      { op: 'wait-for', until: 'idle' },
      { op: 'checkpoint', label: 'round-end-ui' },
      { op: 'next-round' },
      { op: 'wait-for', until: 'bidding' },
      { op: 'bid' },
      { op: 'wait-for', until: 'playing' },
      ...playOnTurn(),
      ...finishTrick,
    ],
  },
  {
    id: 'game-end',
    title: 'Final trick of the game while animations are still running',
    covers: ['game-end', 'collection', 'trick-win'],
    table: { round: 1, leadSeat: 1, customRoundCount: 1 },
    steps: [
      ...playOnTurn(),
      { op: 'wait-for', until: 'trick-collected' },
      { op: 'wait', ms: 500 },
    ],
  },
  {
    id: 'high-latency',
    title: 'Two tricks over a 250ms link with 200ms jitter',
    covers: ['latency', 'opponent-throw', 'collection'],
    table: { round: 2, leadSeat: 1 },
    steps: [
      { op: 'network', latencyMs: 250, jitterMs: 200 },
      { op: 'repeat', times: 2, steps: [...playOnTurn({ op: 'play', card: 'random' }), { op: 'wait-for', until: 'trick-collected' }] },
      { op: 'wait-for', until: 'idle' },
    ],
  },
  {
    id: 'stall-burst',
    title: 'Messages stall for 2.5s (throttled tab) then arrive as one burst',
    covers: ['burst', 'play-sequencer', 'collection'],
    table: { leadSeat: 1 },
    steps: [
      { op: 'wait', ms: 900 },
      { op: 'stall', ms: 2500 },
      ...playOnTurn(),
      ...finishTrick,
    ],
  },
  {
    id: 'reconnect-mid-trick',
    title: 'Connection drops while cards are in flight and comes back',
    covers: ['reconnect', 'state-replay', 'opponent-throw', 'collection'],
    table: { leadSeat: 1 },
    steps: [
      { op: 'wait', ms: 1700 },
      { op: 'drop-connection' },
      { op: 'wait-for', until: 'connected' },
      ...playOnTurn(),
      ...finishTrick,
    ],
  },
  {
    id: 'reconnect-missed-trick-complete',
    title: 'The trick completes while disconnected; the client recovers it from state',
    covers: ['reconnect', 'missed-trick-recovery', 'collection'],
    table: { leadSeat: 0, round: 2 },
    steps: [
      { op: 'bots', mode: 'manual' },
      ...playOnTurn(),
      { op: 'bot-play', count: 1 },
      { op: 'wait', ms: 1200 },
      { op: 'drop-connection' },
      { op: 'bot-play', count: 5 },
      { op: 'bots', mode: 'auto' },
      { op: 'wait-for', until: 'connected' },
      { op: 'wait-for', until: 'trick-collected' },
      { op: 'wait-for', until: 'idle' },
    ],
  },
  {
    id: 'theme-switch-mid-flight',
    title: 'Card and table theme change while cards fly; collection style changes mid-collection',
    covers: ['theme-switch', 'material-rebuild', 'collection'],
    table: { leadSeat: 1 },
    steps: [
      { op: 'wait', ms: 900 },
      { op: 'settings', patch: { cardTheme: 'next', tableTheme: 'next' } },
      ...playOnTurn(),
      { op: 'wait-for', until: 'collecting' },
      { op: 'settings', patch: { collectionAnimation: 'next' } },
      ...finishTrick,
    ],
  },
  {
    id: 'collection-style-switch',
    title: 'Collection style changes during gather, during the first flight and after the last card lands',
    covers: ['collection', 'mode-switch', 'card-trail'],
    table: { leadSeat: 1 },
    steps: [
      ...playOnTurn(),
      { op: 'wait-for', until: 'collecting' },
      { op: 'wait', ms: 150 },
      { op: 'settings', patch: { collectionAnimation: 'next' } },
      { op: 'wait', ms: 450 },
      { op: 'settings', patch: { collectionAnimation: 'next' } },
      { op: 'wait-for', until: 'trick-collected' },
      { op: 'settings', patch: { collectionAnimation: 'next' } },
      ...playOnTurn(),
      ...finishTrick,
    ],
  },
  {
    id: 'special-cards',
    title: 'Wizard and jester tricks back to back',
    covers: ['wizard', 'jester', 'special-sounds', 'collection'],
    table: {
      round: 3,
      leadSeat: 1,
      hands: { 0: ['WIZARD-0', 'JESTER-0', 'GIANTS-9'], 1: ['WIZARD-1', 'ELVES-2', 'HUMANS-4'] },
      trumpSuit: Suit.DWARVES,
    },
    steps: [
      ...playOnTurn({ op: 'play', card: 'wizard' }),
      { op: 'wait-for', until: 'trick-collected' },
      ...playOnTurn({ op: 'play', card: 'jester', via: 'drag-throw' }),
      ...finishTrick,
    ],
  },
];

/** Visits every card x table x UI theme combination once, in order (sizes read from the presets). */
const sweepAllThemeCombinations = (dwellMs: number): SandboxStep => ({
  op: 'repeat',
  times: THEME_PRESETS.length,
  steps: [
    { op: 'repeat', times: TABLE_THEMES.length, steps: [
      { op: 'repeat', times: CARD_THEMES.length, steps: [{ op: 'wait', ms: dwellMs }, { op: 'settings', patch: { cardTheme: 'next' } }] },
      { op: 'settings', patch: { tableTheme: 'next' } },
    ] },
    { op: 'settings', patch: { theme: 'next' } },
  ],
});

/**
 * Every theme combination while the table is busy: rounds played back to back at server pace
 * (you autoplay cards, bids and next round), switching theme every 150ms (9 frames), so each
 * combination is rendered during flights, landings, collections and round transitions.
 */
export const THEME_SWEEP_SCENARIO: SandboxScenario = {
  id: 'theme-sweep',
  title: 'Every card x table x UI theme combination during continuous play',
  covers: ['theme-switch', 'material-rebuild', 'opponent-throw', 'command-play', 'collection', 'stacked-deck'],
  table: { round: 8, leadSeat: 1 },
  steps: [
    { op: 'autoplay', enabled: true },
    sweepAllThemeCombinations(150),
    { op: 'autoplay', enabled: false },
    { op: 'wait-for', until: 'idle' },
  ],
};

/**
 * Steady-state load for frame-time budgets (run with clock=real): a full nine-card round played
 * at server pace, so flights, landings, collections and a growing deck stack overlap continuously.
 */
export const PERF_ROUND_SCENARIO: SandboxScenario = {
  id: 'perf-round',
  title: 'A full round at server pace, for frame-time measurement',
  covers: ['performance', 'opponent-throw', 'command-play', 'collection', 'stacked-deck'],
  table: { round: 9, leadSeat: 1 },
  steps: [
    { op: 'autoplay', enabled: true },
    { op: 'wait-for', until: 'round-end', timeoutMs: 240000 },
    { op: 'autoplay', enabled: false },
    { op: 'wait-for', until: 'idle' },
  ],
};
