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
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function playMuted(this: HTMLMediaElement) {
    this.muted = true;
    return play.call(this);
  };
}
