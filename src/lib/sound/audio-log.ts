const warned = new Set<string>();

/**
 * Logs an expected audio condition (no Web Audio, autoplay policy, decode failure) once per
 * `key`. Never console.error: these are browser states, not bugs, and must not fail e2e runs.
 */
export function warnAudioOnce(key: string, message: string, detail?: unknown): void {
  if (warned.has(key)) return;
  warned.add(key);
  if (detail === undefined) console.warn(`[Sound] ${message}`);
  else console.warn(`[Sound] ${message}`, detail);
}
