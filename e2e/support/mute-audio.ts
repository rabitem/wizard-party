/**
 * Silences a test page on every engine; install it with `page.addInitScript(muteAudio)` so it runs
 * before any page script. Chromium launches with --mute-audio and Firefox at zero volume
 * (playwright.config.ts), but Playwright's WebKit has no such switch and plays Web Audio through
 * the speakers. The game's sound code still runs: every audio context plays into a zero gain and
 * media elements start muted. Self-contained: Playwright serialises the function into the page.
 */
export function muteAudio(): void {
  const base = (window as unknown as { BaseAudioContext?: typeof BaseAudioContext }).BaseAudioContext;
  const destination = base ? Object.getOwnPropertyDescriptor(base.prototype, 'destination')?.get : undefined;
  if (base && destination) {
    const silent = new WeakMap<BaseAudioContext, GainNode>();
    Object.defineProperty(base.prototype, 'destination', {
      configurable: true,
      get(this: BaseAudioContext) {
        let gain = silent.get(this);
        if (!gain) {
          gain = this.createGain();
          gain.gain.value = 0;
          gain.connect(destination.call(this) as AudioDestinationNode);
          silent.set(this, gain);
        }
        return gain;
      },
    });
  }
  // Media elements (WebKit's only audio path on Windows): muted and at zero volume whatever the
  // game sets; the game still reads back the volume it chose.
  const media = HTMLMediaElement.prototype;
  const volume = Object.getOwnPropertyDescriptor(media, 'volume');
  const muted = Object.getOwnPropertyDescriptor(media, 'muted');
  if (volume?.get && volume.set && muted?.set) {
    const chosen = new WeakMap<HTMLMediaElement, number>();
    const silence = (element: HTMLMediaElement) => {
      volume.set?.call(element, 0);
      muted.set?.call(element, true);
    };
    Object.defineProperty(media, 'volume', {
      configurable: true,
      get(this: HTMLMediaElement) { return chosen.get(this) ?? 1; },
      set(this: HTMLMediaElement, value: number) { chosen.set(this, value); silence(this); },
    });
    Object.defineProperty(media, 'muted', {
      configurable: true,
      get() { return true; },
      set(this: HTMLMediaElement) { silence(this); },
    });
    const play = media.play;
    media.play = function playSilently(this: HTMLMediaElement) {
      silence(this);
      return play.call(this);
    };
  }
}
