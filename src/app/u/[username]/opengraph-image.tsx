import { ImageResponse } from 'next/og';

import { SITE_HOST } from '@/config/deployment.config';
import { portraitSpriteDataUrl } from '@/infrastructure/character/portrait-sprite-image';
import { resolveProfileHandle } from '@/presentation/components/account/public/public-profile-links';

import { renderHomePreview } from '../../_og/home-preview';
import { OG_COLORS, OG_FONTS, OG_SIZE, OgBackdrop, OgHost, OgLockup } from '../../_og/og-kit';
import { DEFAULT_OG_REALM } from '../../_og/og-realm';
import { loadProfile } from './load-profile';

export const runtime = 'nodejs';
/** As the page: refreshed at most once a minute, purged with the profile's cache tag. */
export const revalidate = 60;
export const alt = 'A Wizard Party player: their character, name and level.';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** The medallion around the portrait, and the portrait inside it. */
const MEDALLION = { SIZE: 340, RING: 8 } as const;
/** Names longer than this get the smaller headline size (usernames have at most 20 characters). */
const LONG_NAME = 13;

type Props = { params: Promise<{ username: string }> };

function Medallion({ portrait }: { portrait: string }) {
  const face = MEDALLION.SIZE - 2 * MEDALLION.RING;
  return (
    <div
      style={{
        display: 'flex',
        width: MEDALLION.SIZE,
        height: MEDALLION.SIZE,
        borderRadius: MEDALLION.SIZE,
        padding: MEDALLION.RING,
        backgroundImage: `linear-gradient(135deg, #fff3b0 0%, ${OG_COLORS.BRASS} 40%, #ffe27a 65%, #8a6508 100%)`,
        boxShadow: '0 0 80px rgba(233,196,106,0.35)',
      }}
    >
      <div style={{ display: 'flex', flex: 1, borderRadius: face, overflow: 'hidden', backgroundImage: 'radial-gradient(circle at 35% 30%, rgba(120,80,30,0.95), rgba(20,15,10,1))' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img only */}
        <img src={portrait} width={face} height={face} alt="" />
      </div>
    </div>
  );
}

/**
 * A public profile's link preview: the player's character portrait (the committed sprite of their
 * look), name, level and title over the room. Private, missing or misspelled profiles get the
 * site's own preview, so the image never says more than the page.
 */
export default async function Image({ params }: Props) {
  const handle = resolveProfileHandle((await params).username);
  const profile = handle.kind === 'canonical' ? await loadProfile(handle.username) : null;
  if (!profile) return renderHomePreview();
  const portrait = await portraitSpriteDataUrl(profile.appearance);
  const { level, title } = profile.progression;
  const name = profile.displayName;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: OG_COLORS.INK, fontFamily: 'Gelasio' }}>
        <OgBackdrop realm={DEFAULT_OG_REALM} kind="side" shade="linear-gradient(to right, rgb(11,8,5) 0%, rgba(11,8,5,0.92) 50%, rgba(11,8,5,0.55) 100%)" />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', padding: '56px 72px', gap: 48 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, width: 640 }}>
            <OgLockup />
            <div style={{ marginTop: 72, fontSize: name.length > LONG_NAME ? 60 : 80, lineHeight: 1.05, color: OG_COLORS.TEXT, letterSpacing: '-0.015em' }}>{name}</div>
            <div style={{ marginTop: 14, fontSize: 36, color: OG_COLORS.BRASS }}>{`Level ${level} · ${title}`}</div>
            <div style={{ marginTop: 18, fontSize: 26, color: OG_COLORS.MUTED }}>
              {`${profile.stats.gamesPlayed} games played · ${profile.stats.gamesWon} won`}
            </div>
          </div>
          <Medallion portrait={portrait} />
        </div>
        <OgHost host={SITE_HOST} />
      </div>
    ),
    { ...OG_SIZE, fonts: OG_FONTS }
  );
}
