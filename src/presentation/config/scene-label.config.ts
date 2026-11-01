/**
 * Information drawn into the 3D scene (seat nameplates, played-card owner chips) is sized in
 * screen pixels, not table units: labels face the camera and keep a constant cap height, so
 * they stay readable on a pulled-back portrait phone and do not balloon on a 4K monitor.
 * Decoration (engraved plates, glows) stays in world units.
 */
export const SCENE_LABEL = {
  /** Cap height / font size of the scene font */
  CAP_HEIGHT_RATIO: 0.72,
  /** Design font size in world units; the on-screen size comes from CAP_PX */
  FONT_SIZE: 0.1,
  SEAT: {
    /** On-screen cap height (>= 11 px everywhere) */
    CAP_PX: 12,
    /** Above the rim, clear of the opponent's standing hand */
    LIFT: 0.55,
    /** From the brandmark toward the table centre, so side labels stay on screen */
    INWARD: 0.25,
    /** Seats further than this from the centre line (x) grow their label inward */
    SIDE_ANCHOR_X: 0.6,
    MAX_NAME_CHARS: 9,
    OUTLINE_WIDTH: 0.012,
  },
  OWNER_BADGE: {
    CAP_PX: 11,
    /** Height above the card face the chip hovers at (card-local z) */
    LIFT: 0.06,
    MAX_NAME_CHARS: 8,
    DOT_RADIUS: 0.075,
    OUTLINE_WIDTH: 0.012,
  },
  /** Label colours */
  COLORS: {
    TEXT: '#f4dfb8',
    LOCAL: '#ffd76a',
    TURN: '#ffd700',
    OUTLINE: '#160c05',
  },
} as const;
