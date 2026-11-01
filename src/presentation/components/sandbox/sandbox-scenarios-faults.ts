import { SANDBOX_FAULTS } from '../../config/sandbox.config';
import { finishTrick, playOnTurn } from './sandbox-scenarios';
import type { SandboxScenario } from './sandbox.types';

/** Reconnect waits cover the client's backoff after failed attempts (1 s, 2 s, 4 s ...). */
const RECONNECT_TIMEOUT_MS = 20000;

/**
 * What networks, devices and other players do to a running table: a connection superseded by
 * the server, an offline period, state storms, storage that throws, a lost GPU context, a
 * backgrounded tab and floods of emotes and chat. Each keeps a trick in flight while the fault
 * hits, then plays on: the table must recover without replaying, losing or duplicating cards.
 */
export const FAULT_SCENARIOS: readonly SandboxScenario[] = [
  {
    id: 'superseded-close',
    title: 'The server closes the socket as superseded (4000) mid-trick; the table waits, then the player takes the seat back',
    covers: ['reconnect', 'close-code', 'state-replay', 'collection'],
    table: { leadSeat: 1 },
    steps: [
      { op: 'wait', ms: 1700 },
      { op: 'close-socket', code: SANDBOX_FAULTS.SUPERSEDED_CLOSE_CODE, reason: SANDBOX_FAULTS.SUPERSEDED_CLOSE_REASON },
      // A superseded seat never reconnects by itself (that would take it back from the other tab).
      { op: 'wait', ms: 1500 },
      { op: 'take-over-seat' },
      { op: 'wait-for', until: 'connected', timeoutMs: RECONNECT_TIMEOUT_MS },
      ...playOnTurn(),
      ...finishTrick,
    ],
  },
  {
    id: 'offline-online',
    title: 'The device goes offline while cards fly, reconnect attempts fail, then it comes back online',
    covers: ['offline', 'reconnect-backoff', 'online-event', 'state-replay', 'collection'],
    table: { leadSeat: 1 },
    steps: [
      { op: 'wait', ms: 1200 },
      { op: 'offline' },
      { op: 'wait', ms: 2500 },
      { op: 'online' },
      { op: 'wait-for', until: 'connected', timeoutMs: RECONNECT_TIMEOUT_MS },
      ...playOnTurn(),
      ...finishTrick,
    ],
  },
  {
    id: 'state-burst',
    title: 'Full state arrives 20 times in a row while cards fly, and again during collection',
    covers: ['burst', 'state-replay', 'play-sequencer', 'collection'],
    table: { leadSeat: 1 },
    steps: [
      { op: 'wait', ms: 900 },
      { op: 'state-burst', count: 20 },
      ...playOnTurn(),
      { op: 'wait-for', until: 'collecting' },
      { op: 'state-burst', count: 10 },
      ...finishTrick,
    ],
  },
  {
    id: 'storage-throws',
    title: 'Storage throws (private mode, blocked site data) while settings change and a trick plays',
    covers: ['storage', 'settings', 'theme-switch', 'collection'],
    table: { leadSeat: 1 },
    steps: [
      { op: 'storage-fault', mode: 'throw' },
      { op: 'settings', patch: { cardTheme: 'next' } },
      ...playOnTurn(),
      { op: 'storage-fault', mode: 'quota' },
      { op: 'settings', patch: { collectionAnimation: 'next' } },
      ...finishTrick,
      { op: 'storage-fault', mode: 'off' },
    ],
  },
  {
    id: 'context-loss',
    title: 'The WebGL context is lost mid-flight and restored; the table draws again and play continues',
    covers: ['webgl-context-loss', 'recovery', 'opponent-throw', 'collection'],
    table: { leadSeat: 1 },
    steps: [
      { op: 'wait', ms: 900 },
      { op: 'lose-context', restoreAfterMs: SANDBOX_FAULTS.CONTEXT_RESTORE_AFTER_MS },
      ...playOnTurn(),
      ...finishTrick,
    ],
  },
  {
    id: 'background-tab',
    title: 'The tab is hidden for 3 s while opponents play, then shown again',
    covers: ['visibility', 'liveness-probe', 'catch-up', 'collection'],
    table: { leadSeat: 1 },
    steps: [
      { op: 'wait', ms: 600 },
      { op: 'visibility', state: 'hidden' },
      { op: 'wait', ms: 3000 },
      { op: 'visibility', state: 'visible' },
      ...playOnTurn(),
      ...finishTrick,
    ],
  },
  {
    id: 'social-burst-during-trick',
    title: 'Opponents flood emotes, chat and timeout sounds while the trick flies and is collected',
    covers: ['emote', 'chat', 'timeout-sound', 'provider-fan-out', 'collection'],
    table: { leadSeat: 1 },
    steps: [
      { op: 'wait', ms: 700 },
      { op: 'social', kind: 'emote', count: 12, intervalMs: 50 },
      { op: 'social', kind: 'chat', count: 20, intervalMs: 30 },
      ...playOnTurn(),
      { op: 'social', kind: 'timeout-sound', count: 3, intervalMs: 200 },
      { op: 'wait-for', until: 'collecting' },
      { op: 'social', kind: 'emote', count: 30 },
      ...finishTrick,
    ],
  },
];
