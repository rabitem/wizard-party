import type { ReactNode } from 'react';
import { MANGA_ICONS, burstPath } from '@/presentation/components/hud/skins/manga/manga-icons';
import { MANGA_PALETTE as C } from '@/presentation/components/hud/skins/manga/manga-palette';
import type { LobbyIconComponent, LobbyIconId } from '../lobby-skin.types';

function MangaLobbySvg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      {children}
    </svg>
  );
}

const EMBLEM_BURST = burstPath(12, 12, [11.4, 11.4], [7.6, 7.6], 12);
const SMALL_BURST = burstPath(12, 12, [10.6, 10.6], [6.8, 6.8], 10);

/** Emblem: a yellow comic burst with an inked red "!" and a paper halo. */
function BurstEmblemIcon({ className }: { className?: string }) {
  return (
    <MangaLobbySvg className={className}>
      <path d={EMBLEM_BURST} fill={C.yellow} stroke={C.ink} strokeWidth={1.2} />
      <path d="M12.6 5.6L11.6 13.6" stroke={C.ink} strokeWidth={3.6} />
      <path d="M12.6 5.6L11.6 13.6" stroke={C.red} strokeWidth={2.2} />
      <circle cx={11.3} cy={17.3} r={1.9} fill={C.red} stroke={C.ink} strokeWidth={0.8} />
    </MangaLobbySvg>
  );
}

/** Empty seat: a "..." thought bubble. */
function ThoughtIcon({ className }: { className?: string }) {
  return (
    <MangaLobbySvg className={className}>
      <path
        d="M7 15Q2.6 15 3 11Q2.6 6.6 7.4 6.8Q9 3.2 13 4Q16.6 2.6 18.6 5.8Q22 6.4 21.2 10.4Q22 14.6 17.4 14.6Q15.4 17 12.4 15.6Q9.4 17 7 15Z"
        fill={C.paper}
        stroke={C.ink}
        strokeWidth={1}
      />
      <circle cx={5.2} cy={18.4} r={1.4} fill={C.paper} stroke={C.ink} strokeWidth={0.8} />
      <circle cx={3} cy={21.2} r={0.9} fill={C.paper} stroke={C.ink} strokeWidth={0.7} />
      <circle cx={8.6} cy={10.4} r={1.2} fill={C.ink} />
      <circle cx={12.4} cy={10.4} r={1.2} fill={C.ink} />
      <circle cx={16.2} cy={10.4} r={1.2} fill={C.ink} />
    </MangaLobbySvg>
  );
}

/** Add bot: a rival's spark - a small burst with an inked "+". */
function RivalIcon({ className }: { className?: string }) {
  return (
    <MangaLobbySvg className={className}>
      <path d={SMALL_BURST} fill={C.red} stroke={C.halo} strokeWidth={1} />
      <path d="M12 7.6V16.4M7.6 12H16.4" stroke={C.paper} strokeWidth={2.4} />
    </MangaLobbySvg>
  );
}

/** Start: a square red hanko seal with abstract brush marks. */
function SealIcon({ className }: { className?: string }) {
  return (
    <MangaLobbySvg className={className}>
      <rect x={3} y={3} width={18} height={18} rx={3} fill={C.paper} stroke={C.outline} strokeWidth={0.8} />
      <rect x={4.6} y={4.6} width={14.8} height={14.8} rx={2} stroke={C.red} strokeWidth={1.8} />
      <path d="M8.4 8.4H15.6M12 8.4V15.6M8.8 12.4H15.2M9 15.6H15" stroke={C.red} strokeWidth={1.8} />
    </MangaLobbySvg>
  );
}

/** Lobby glyphs: reuses the HUD's ink-pot trophy and spinning star wheel. */
export const MANGA_LOBBY_ICONS: Partial<Record<LobbyIconId, LobbyIconComponent>> = {
  emblem: BurstEmblemIcon,
  host: MANGA_ICONS.trophy,
  emptySeat: ThoughtIcon,
  addBot: RivalIcon,
  start: SealIcon,
  divider: MANGA_ICONS.settings,
};
