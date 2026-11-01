import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { equippedCosmetics, type AvatarFrameId } from '@shared/domain/account';
import type { SocialPlayer } from '@shared/domain/social';

import { portraitSpriteDataUrl } from '../character/portrait-sprite-image';
import { EMAIL_COLORS } from './email-layout';

/*
 * The two characters of a social email (sender -> recipient) as one PNG: each one's portrait
 * sprite in their level frame, with a symbol in between. Used by invite and friend request mails.
 * Mail clients can't use the site's icon font, CSS or WebGL, and Gmail drops data: URIs, so the
 * card is rendered server-side and sent as an inline (cid:) base64 attachment.
 */

export const INVITE_CARD_SIZE = { width: 1040, height: 400 } as const;

/** What joins the two players in the middle of the card (rpg-awesome glyphs). */
export const PAIR_SYMBOLS = { duel: 0xe97d, friendship: 0xe9fa } as const;
export type PairSymbol = keyof typeof PAIR_SYMBOLS;

/** Edge of the portrait inside the ring, in card pixels. */
const FACE_SIZE = 216;

/** Static ring colours per frame; the site's animated conic rings become linear gradients here. */
const FRAME_RINGS: Record<AvatarFrameId, string> = {
  plain: 'linear-gradient(135deg, #8b6914 0%, #3d3428 100%)',
  bronze: 'linear-gradient(135deg, #f0b27a 0%, #8c5a2b 45%, #d79a5c 70%, #5e3a18 100%)',
  silver: 'linear-gradient(135deg, #ffffff 0%, #9aa3ad 40%, #e7ecf1 65%, #6b737c 100%)',
  gold: 'linear-gradient(135deg, #fff3b0 0%, #d4a017 40%, #ffe27a 65%, #8a6508 100%)',
  arcane: 'linear-gradient(135deg, #7c3aed 0%, #22d3ee 35%, #a78bfa 65%, #6366f1 100%)',
  legendary: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 30%, #f472b6 55%, #fde047 80%, #f97316 100%)',
};

let iconFont: Promise<Buffer> | null = null;

function loadIconFont(): Promise<Buffer> {
  iconFont ??= readFile(join(process.cwd(), 'public', 'fonts', 'rpgawesome-webfont.ttf'));
  return iconFont;
}

const glyph = (codePoint: number) => String.fromCodePoint(codePoint);

function Medallion({ player, portrait }: { player: SocialPlayer; portrait: string }) {
  const ring = FRAME_RINGS[equippedCosmetics(player.level).frameId];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', width: 236, height: 236, borderRadius: 118, padding: 10, backgroundImage: ring, boxShadow: '0 0 60px rgba(212,168,83,0.35)' }}>
        <div
          style={{
            display: 'flex',
            flex: 1,
            borderRadius: 108,
            overflow: 'hidden',
            backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(120,80,30,0.95), rgba(20,15,10,1))',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img only */}
          <img src={portrait} width={FACE_SIZE} height={FACE_SIZE} alt="" />
        </div>
      </div>
      <div style={{ display: 'flex', marginTop: -26, padding: '6px 22px', borderRadius: 999, background: EMAIL_COLORS.card, border: `3px solid ${EMAIL_COLORS.gold}`, color: EMAIL_COLORS.goldBright, fontSize: 30, fontWeight: 700 }}>
        {`Lv ${player.level}`}
      </div>
    </div>
  );
}

/** PNG bytes of the card: `left` (the sender) and `right` (the recipient) joined by `symbol`. */
export async function renderPlayerPairCard(left: SocialPlayer, right: SocialPlayer, symbol: PairSymbol): Promise<Buffer> {
  const [leftPortrait, rightPortrait, iconFontData] = await Promise.all([
    portraitSpriteDataUrl(left.appearance),
    portraitSpriteDataUrl(right.appearance),
    loadIconFont(),
  ]);
  const image = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'space-around',
          backgroundImage: `radial-gradient(ellipse at center, #2a2115 0%, ${EMAIL_COLORS.card} 60%, ${EMAIL_COLORS.page} 100%)`,
        }}
      >
        <Medallion player={left} portrait={leftPortrait} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: EMAIL_COLORS.gold }}>
          <div style={{ display: 'flex', width: 150, height: 3, backgroundImage: `linear-gradient(90deg, transparent, ${EMAIL_COLORS.gold}, transparent)` }} />
          <div style={{ display: 'flex', fontFamily: 'RPGAwesome', fontSize: 84, margin: '14px 0' }}>{glyph(PAIR_SYMBOLS[symbol])}</div>
          <div style={{ display: 'flex', width: 150, height: 3, backgroundImage: `linear-gradient(90deg, transparent, ${EMAIL_COLORS.gold}, transparent)` }} />
        </div>
        <Medallion player={right} portrait={rightPortrait} />
      </div>
    ),
    { ...INVITE_CARD_SIZE, fonts: [{ name: 'RPGAwesome', data: iconFontData, style: 'normal', weight: 400 }] }
  );
  return Buffer.from(await image.arrayBuffer());
}
