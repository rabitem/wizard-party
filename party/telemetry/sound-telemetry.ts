import type { CustomSound, CustomTrickWinAudio, SoundPreferences } from '../../shared/domain';
import {
  TELEMETRY_PAYLOAD_LIMITS,
  boundedText,
  type TelemetryCustomAudio,
  type TelemetryCustomAudioList,
  type TelemetrySoundPreferences,
} from '../../shared/telemetry';

/**
 * Reduces sound data to metadata. Custom sounds carry their audio as base64 data URLs of up to a few
 * megabytes; telemetry records what was chosen, never the audio itself.
 */

const { MAX_SHORT_TEXT_LENGTH, MAX_LIST_ITEMS } = TELEMETRY_PAYLOAD_LIMITS;

/** `data:audio/mpeg;base64,...` -> `audio/mpeg`. Only the header is inspected. */
const DATA_URL_MIME_TYPE = /^data:([\w.+-]+\/[\w.+-]+)[;,]/;

function mimeTypeOf(dataUrl: unknown): string | null {
  if (typeof dataUrl !== 'string') return null;
  const match = DATA_URL_MIME_TYPE.exec(dataUrl.slice(0, MAX_SHORT_TEXT_LENGTH));
  return match ? match[1] : null;
}

function enabledRoles(roles: unknown): string[] {
  if (typeof roles !== 'object' || roles === null) return [];
  return Object.entries(roles)
    .filter(([, enabled]) => enabled === true)
    .map(([role]) => role)
    .slice(0, MAX_LIST_ITEMS);
}

function finiteOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function summarizeCustomAudio(audio: CustomTrickWinAudio | CustomSound): TelemetryCustomAudio {
  return {
    id: boundedText(audio.id, MAX_SHORT_TEXT_LENGTH) ?? '',
    name: boundedText(audio.name, MAX_SHORT_TEXT_LENGTH) ?? '',
    mimeType: mimeTypeOf(audio.dataUrl),
    byteSize: finiteOrZero(audio.size),
    durationSec: finiteOrZero(audio.duration),
    category: boundedText(audio.category, MAX_SHORT_TEXT_LENGTH),
    roles: enabledRoles((audio as Partial<CustomSound>).roles),
  };
}

function summarizeAudioList(list: readonly CustomSound[] | null): TelemetryCustomAudioList | null {
  if (list === null) return null;
  return { count: list.length, items: list.slice(0, MAX_LIST_ITEMS).map(summarizeCustomAudio) };
}

/** Summarizes a (normalized) preferences update; only keys present in the update are reported. */
export function summarizeSoundPreferences(preferences: SoundPreferences): TelemetrySoundPreferences {
  const summary: TelemetrySoundPreferences = {};
  if (preferences.trickWinSound !== undefined) {
    summary.trickWinSound = boundedText(preferences.trickWinSound, MAX_SHORT_TEXT_LENGTH) ?? '';
  }
  if (preferences.customTrickWinAudio !== undefined) {
    summary.customTrickWinAudio = preferences.customTrickWinAudio && summarizeCustomAudio(preferences.customTrickWinAudio);
  }
  if (preferences.customTrickWinAudios !== undefined) {
    summary.customTrickWinAudios = summarizeAudioList(preferences.customTrickWinAudios);
  }
  if (preferences.sharedCustomSounds !== undefined) {
    summary.sharedCustomSounds = summarizeAudioList(preferences.sharedCustomSounds);
  }
  return summary;
}
