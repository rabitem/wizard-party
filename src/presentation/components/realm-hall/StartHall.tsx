'use client';

import type { ComponentProps } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, Settings2, Sparkles } from 'lucide-react';
import {
  ExpansionShowcaseSection,
  FooterSection,
  HowToWinSection,
  LearnToPlaySection,
  PlayCard,
  RecentRoomsSection,
  TournamentsSection,
  type RecentRoom,
  type RoomSettings,
} from '../room-browser';
import { GlobalStatsPanel } from '../GlobalStatsPanel';
import { GOLD_BUTTON_STYLE } from '../lobby/table';
import { HallOfChampions } from '../hall-of-champions';
import { RealmPulse } from '../realm-pulse';
import { GuestHint } from '../account';
import { HallDock } from './HallDock';
import { HallStation } from './HallStation';
import { HallSign } from './HallSign';
import { HallLoader } from './HallLoader';
import { RealmHallBackdrop } from './RealmHallBackdrop';
import { RealmLenses } from './RealmLenses';
import { useHallScrollProgress } from './useHallScrollProgress';

const RealmHallCanvas = dynamic(() => import('./RealmHallCanvas').then((module) => module.RealmHallCanvas), { ssr: false });

const SERIF = { fontFamily: 'Georgia, serif' } as const;

interface StartHallProps {
  playCard: ComponentProps<typeof PlayCard>;
  openTutorial: () => void;
  recentRooms: RecentRoom[];
  handleJoinRoom: (roomId: string, roomSettings?: RoomSettings) => void;
}

/** Under the play form: scrolling walks you through the room to the table. */
function WalkCue() {
  return (
    <p className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-200/80" style={SERIF}>
      Scroll to walk to the table
      <ChevronDown className="w-4 h-4 motion-safe:animate-bounce" aria-hidden />
    </p>
  );
}

/** The last stop: the table itself, the live count of the tables in play and a seat to take. */
function TableStation({ onQuickJoin, onCreateRoom }: { onQuickJoin: () => void; onCreateRoom: () => void }) {
  return (
    <HallStation side="center" label="Your seat" panel={false} className="md:items-end md:pb-[14svh]">
      <div className="text-center">
        <h2 className="text-4xl sm:text-5xl leading-tight text-amber-50 [text-wrap:balance]" style={SERIF}>Your seat is waiting</h2>
        <p className="mt-3 text-base sm:text-lg text-amber-200/85" style={SERIF}>Three to six players, any mix of friends and bots.</p>
        <div className="mt-7 mx-auto max-w-sm space-y-2.5">
          <button
            type="button"
            onClick={onQuickJoin}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-base cursor-pointer active:scale-[0.98] hover:brightness-105"
            style={GOLD_BUTTON_STYLE}
          >
            <Sparkles className="w-4 h-4" aria-hidden />Quick play
          </button>
          <button
            type="button"
            onClick={onCreateRoom}
            className="w-full h-11 rounded-xl border border-amber-700/50 flex items-center justify-center gap-2 text-sm text-amber-100 cursor-pointer hover:bg-amber-900/25 hover:border-amber-500/60 active:scale-[0.98]"
            style={SERIF}
          >
            <Settings2 className="w-4 h-4" aria-hidden />Create room
          </button>
        </div>
        <div className="mt-10 text-left"><RealmPulse /></div>
      </div>
    </HallStation>
  );
}

/**
 * The start page as a walk through the active realm's own game room: the play form at the edge of
 * the room, then the notices, the champions, the chronicles and the rulebook, and finally the
 * table. The live room renders behind the page; each HallStation brings the camera to its stop.
 */
export function StartHall({ playCard, openTutorial, recentRooms, handleJoinRoom }: StartHallProps) {
  useHallScrollProgress();
  return (
    <>
      <RealmHallBackdrop />
      <RealmHallCanvas />
      <HallLoader />
      <HallDock />

      <HallStation side="center" label="The door" panel={false} topFade className="pt-20 sm:pt-12 md:pb-6" columnClassName="md:min-h-[calc(100svh-4.5rem)] flex flex-col gap-8 md:justify-between">
        <HallSign />
        <div>
          <RealmLenses className="mb-5 lg:mb-0 lg:absolute lg:left-10 lg:top-1/2 lg:-translate-y-1/2" />
          <PlayCard {...playCard} className="" />
          <WalkCue />
        </div>
      </HallStation>

      <HallStation side="right" label="Notices">
        <GuestHint className="mb-6 sm:mb-8" />
        <LearnToPlaySection onOpenTutorial={openTutorial} />
        <TournamentsSection />
        <RecentRoomsSection recentRooms={recentRooms} canPlay={playCard.identity.accountStatus !== 'loading'} onJoinRoom={handleJoinRoom} />
      </HallStation>

      <HallStation side="left" label="Hall of Champions">
        <HallOfChampions />
      </HallStation>

      <HallStation side="right" label="Chronicles of the realm">
        <GlobalStatsPanel />
      </HallStation>

      <HallStation side="left" label="The rulebook">
        <HowToWinSection />
        <ExpansionShowcaseSection />
      </HallStation>

      <TableStation onQuickJoin={playCard.onQuickJoin} onCreateRoom={playCard.onCreateRoom} />

      <div className="relative z-10 bg-[linear-gradient(180deg,transparent,var(--page-base)_40%)] pt-16 px-4">
        <div className="max-w-2xl mx-auto"><FooterSection /></div>
      </div>
    </>
  );
}
