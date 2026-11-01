import type { Suit } from '@shared/domain';
import type { SandboxSettings } from './sandbox.types';

export type CardSelector = 'first' | 'last' | 'random' | 'wizard' | 'jester' | 'number' | string;

/**
 * How the local player plays. Everything except 'command' goes through the real 3D hand
 * (pointer events on the canvas); 'command' calls the play handler directly, like a
 * protocol-level play, and skips the hand's launch pose.
 */
export type PlayMethod =
  | 'command'
  | 'double-tap'
  | 'drag-throw'
  | 'drag-slow'
  | 'flick'
  | 'drag-cancel'
  | 'drag-interrupt'
  /** A second finger lands mid-drag (touch), moves, lifts; then the first finger lets go short of the table. */
  | 'drag-second-finger';

/** Pointer the gestures use. 'auto' follows the device: touch on a coarse pointer, mouse otherwise. */
export type PointerKind = 'auto' | 'mouse' | 'touch';

export type WaitCondition =
  | 'local-turn'
  | 'all-landed'
  | 'collecting'
  | 'trick-collected'
  | 'idle'
  | 'hand-idle'
  | 'connected'
  | 'round-end'
  | 'bidding'
  | 'playing';

/** Server-to-client social traffic a burst injects. */
export type SocialBurstKind = 'emote' | 'chat' | 'timeout-sound';

/** 'throw': every storage call throws (private mode, blocked site data); 'quota': writes throw QuotaExceededError. */
export type StorageFaultMode = 'throw' | 'quota' | 'off';

export type SandboxStep =
  | { op: 'play'; card?: CardSelector; via?: PlayMethod; pointer?: PointerKind }
  | { op: 'bots'; mode: 'auto' | 'manual'; delayMs?: number }
  /** While enabled, the local seat plays its first playable card (by command) whenever it may. */
  | { op: 'autoplay'; enabled: boolean }
  | { op: 'bot-play'; count?: number }
  | { op: 'wait'; ms: number }
  | { op: 'wait-for'; until: WaitCondition; timeoutMs?: number }
  | { op: 'shuffle' }
  | { op: 'sort' }
  | { op: 'network'; latencyMs?: number; jitterMs?: number }
  | { op: 'stall'; ms: number }
  | { op: 'drop-connection' }
  /** Values are setting ids, or 'next' to cycle to the following option. */
  | { op: 'settings'; patch: Partial<Record<keyof SandboxSettings, string>> }
  | { op: 'bid'; bid?: number }
  | { op: 'select-trump'; suit?: Suit }
  | { op: 'next-round' }
  /** Runs the full layout and playability audit on what is on screen now. */
  | { op: 'checkpoint'; label: string }
  | { op: 'repeat'; times: number; steps: SandboxStep[] }
  // Capture ---------------------------------------------------------------------------------
  /**
   * Freezes the clock, lets pending work render, audits the layout and records the scene facts
   * (and the canvas image with `image`). With `hold` the run waits, frozen, until the driver
   * releases it (a Playwright toHaveScreenshot in between). `label` may use {cardTheme},
   * {tableTheme} and {theme} placeholders.
   */
  | { op: 'snapshot'; label: string; hold?: boolean; image?: boolean }
  /** Hands control to the driver (real touch input, manual checks) at real-time pace until released. */
  | { op: 'external'; label: string }
  /** Starts or ends a named measurement window (render, upload, shader and React counts). */
  | { op: 'measure-start'; label: string }
  | { op: 'measure-end'; label: string }
  // Faults ----------------------------------------------------------------------------------
  /** The server closes the socket with this code (4000: the connection was superseded by a newer one). */
  | { op: 'close-socket'; code: number; reason?: string }
  /** The player takes the seat back after a superseded close ("Play here"). */
  | { op: 'take-over-seat' }
  /** The browser goes offline: `offline` fires, the socket drops and new connections fail until `online`. */
  | { op: 'offline' }
  | { op: 'online' }
  /** The server re-sends the full state `count` times in a row (other players' commands, reconnect storms). */
  | { op: 'state-burst'; count: number }
  | { op: 'storage-fault'; mode: StorageFaultMode }
  /** Loses the WebGL context (GPU reset, tab memory pressure) and restores it after `restoreAfterMs`. */
  | { op: 'lose-context'; restoreAfterMs?: number }
  /** Emulates the tab being hidden or shown (visibilityState plus a visibilitychange event). */
  | { op: 'visibility'; state: 'hidden' | 'visible' }
  // Social ----------------------------------------------------------------------------------
  /** Opponents send `count` emotes, chat lines or timeout sounds, `intervalMs` apart (0: one burst). */
  | { op: 'social'; kind: SocialBurstKind; count: number; intervalMs?: number };

export type SandboxStepOp = SandboxStep['op'];
