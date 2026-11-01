import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { equippedCosmetics, type AvatarFrameId } from '@shared/domain/account';
import type { SocialPlayer } from '@shared/domain/social';

import { EMAIL_COLORS } from './email-layout';

/*
 * The two avatars of a social email (sender -> recipient) as one PNG, with a symbol in between.
 * Used by invite and friend request mails. Mail clients can't use the
 * site's icon font or CSS, and Gmail drops data: URIs, so the card is rendered server-side and sent
 * as an inline (cid:) base64 attachment.
 */

export const INVITE_CARD_SIZE = { width: 1040, height: 400 } as const;

/** rpg-awesome glyphs of the avatar presets (src/presentation/components/settings/avatar-presets.ts). */
export const AVATAR_GLYPHS: Record<string, number> = {
  wizard: 0xe982, knight: 0xe9fe, crown: 0xe97f, dragon: 0xe9a2, sword: 0xe946, shield: 0xea96, axe: 0xe917,
  archer: 0xe90d, scroll: 0xea8f, potion: 0xea72, torch: 0xead1, skull: 0xeaa1, trophy: 0xead7, beer: 0xe92a,
  jester: 0xea68, gem: 0xe9df, hearts: 0xe9fa, eye: 0xe915, lightning: 0xea2d, ghost: 0xe98c, dice: 0xe998,
  brain: 0xe93a, wolf: 0xeae8, fire: 0xe9c3, muscle: 0xea48, fairy: 0xe9b7, 'crossed-swords': 0xe97d,
  raven: 0xea7a, health: 0xe9f5, 'spinning-sword': 0xeab3, key: 0xea15,
};

/** What joins the two players in the middle of the card. */
export const PAIR_SYMBOLS = { duel: 0xe97d, friendship: 0xe9fa } as const;
export type PairSymbol = keyof typeof PAIR_SYMBOLS;

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

function Medallion({ player }: { player: SocialPlayer }) {
  const ring = FRAME_RINGS[equippedCosmetics(player.level).frameId];
  const icon = glyph(AVATAR_GLYPHS[player.avatar ?? ''] ?? AVATAR_GLYPHS.wizard);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', width: 236, height: 236, borderRadius: 118, padding: 10, backgroundImage: ring, boxShadow: '0 0 60px rgba(212,168,83,0.35)' }}>
        <div
          style={{
            display: 'flex',
            flex: 1,
            borderRadius: 108,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(120,80,30,0.95), rgba(20,15,10,1))',
            color: EMAIL_COLORS.goldBright,
            fontFamily: 'RPGAwesome',
            fontSize: 112,
          }}
        >
          {icon}
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
        <Medallion player={left} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: EMAIL_COLORS.gold }}>
          <div style={{ display: 'flex', width: 150, height: 3, backgroundImage: `linear-gradient(90deg, transparent, ${EMAIL_COLORS.gold}, transparent)` }} />
          <div style={{ display: 'flex', fontFamily: 'RPGAwesome', fontSize: 84, margin: '14px 0' }}>{glyph(PAIR_SYMBOLS[symbol])}</div>
          <div style={{ display: 'flex', width: 150, height: 3, backgroundImage: `linear-gradient(90deg, transparent, ${EMAIL_COLORS.gold}, transparent)` }} />
        </div>
        <Medallion player={right} />
      </div>
    ),
    { ...INVITE_CARD_SIZE, fonts: [{ name: 'RPGAwesome', data: await loadIconFont(), style: 'normal', weight: 400 }] }
  );
  return Buffer.from(await image.arrayBuffer());
}
