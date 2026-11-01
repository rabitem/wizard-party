/**
 * The hall painted in CSS: lamplight at the far end over the realm's page colours. It sits under
 * the live canvas while that loads, and is the whole backdrop where WebGL is missing.
 */
export function RealmHallBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          'radial-gradient(ellipse 26% 30% at 50% 42%, color-mix(in srgb, var(--glow) 90%, transparent) 0%, transparent 70%), linear-gradient(180deg, color-mix(in srgb, var(--page-base) 70%, #2a1a0e) 0%, var(--page-base) 70%)',
      }}
    />
  );
}
