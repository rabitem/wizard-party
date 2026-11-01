'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, RefreshCw, Swords, Trophy } from 'lucide-react';

import type { TournamentListStatus } from '@shared/application/ports/tournament';

import { useAccount } from '@/presentation/providers/AccountProvider';
import { useTournamentAvailability } from '@/presentation/hooks/useTournamentAvailability';
import { useTournamentList } from '@/presentation/hooks/useTournamentList';
import { useTournamentsOfViewer } from '@/presentation/hooks/useTournamentsOfViewer';
import { TOURNAMENT_LIST_TABS, TOURNAMENT_ROUTES, TOURNAMENT_UI } from '@/presentation/config/tournament.config';

import { HEADER_HIGHLIGHT, TITLE_GLOW } from '../account/account-surfaces';
import { AccountShell } from '../account/AccountShell';
import { Button, Notice, Panel, SERIF } from '../account/ui';
import { RecentChampionsStrip } from './RecentChampionsStrip';
import { TournamentCard } from './TournamentCard';
import { TournamentMessage, TournamentSkeleton, TournamentsUnavailable } from './TournamentStates';
import { TournamentTrophyIcon } from './TournamentTrophyIcon';
import { entryLine, hostAccess, myTournamentsStrip, type HostAccess } from './tournament-view-model';

const TAB_PARAM = 'tab';

function isListTab(value: string | null): value is TournamentListStatus {
  return TOURNAMENT_LIST_TABS.some((tab) => tab.id === value);
}

const HOST_LINKS: Record<Exclude<HostAccess, 'loading'>, string> = {
  sign_in: TOURNAMENT_ROUTES.signIn(TOURNAMENT_ROUTES.NEW),
  ready: TOURNAMENT_ROUTES.NEW,
};

/** "Host a tournament": signs guests in first. */
function HostButton() {
  const { status } = useAccount();
  const access = hostAccess({ status });
  if (access === 'loading') return null;
  const href = HOST_LINKS[access];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Link
        href={href}
        className="inline-flex items-center justify-center gap-2 rounded-xl px-5 min-h-11 text-sm border-2 border-amber-600/60 text-amber-100 hover:border-amber-500/80 hover:text-white transition-all active:scale-[0.98] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-border)_100%,transparent)_0%,color-mix(in_srgb,var(--page-base)_70%,transparent)_100%)] shadow-[0_4px_20px_color-mix(in_srgb,var(--glow)_40%,transparent)]"
        style={SERIF}
      >
        <Plus className="w-4 h-4" aria-hidden />
        Host a tournament
      </Link>
      {access === 'sign_in' ? <span className="text-[11px] text-amber-200/45">Sign in to host or enter tournaments.</span> : null}
    </div>
  );
}

function Hero() {
  return (
    <Panel>
      <div className="relative px-5 py-7 sm:py-9 text-center" style={{ background: HEADER_HIGHLIGHT }}>
        <Trophy className="mx-auto mb-2 w-9 h-9 text-amber-400/80" strokeWidth={1.5} aria-hidden />
        <h1 className="text-2xl sm:text-3xl text-amber-50" style={{ ...SERIF, textShadow: TITLE_GLOW }}>
          Tournaments
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-amber-200/55 leading-relaxed">
          Gather a field, play real tables round after round and crown a champion. Trophies and XP for the best.
        </p>
        <div className="mt-5">
          <HostButton />
        </div>
      </div>
    </Panel>
  );
}

function MyTournaments() {
  const { status, user } = useAccount();
  const view = useTournamentsOfViewer(status === 'signed-in' ? user?.id ?? null : null);
  const strip = useMemo(() => (view ? myTournamentsStrip(view, TOURNAMENT_UI.MY_TOURNAMENTS_STRIP_SIZE) : []), [view]);
  if (!view || (strip.length === 0 && view.trophies.length === 0)) return null;
  return (
    <section aria-labelledby="my-tournaments" className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="my-tournaments" className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400/70" style={SERIF}>
          <Swords className="w-4 h-4 text-amber-500/70" aria-hidden />
          Your tournaments
        </h2>
        {view.trophies.length > 0 ? (
          <span className="flex items-center gap-1" aria-label={`${view.trophies.length} trophies`}>
            {view.trophies.slice(0, TOURNAMENT_UI.TROPHY_PREVIEW_SIZE).map((trophy) => (
              <TournamentTrophyIcon key={`${trophy.tournamentId}-${trophy.awardId}`} icon={trophy.icon} tier={trophy.tier} size="sm" title={`${trophy.name} · ${trophy.tournamentName}`} />
            ))}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {strip.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} footnote={entryLine(tournament.entry, tournament.isHost)} />
        ))}
      </div>
    </section>
  );
}

function ListTabs({ value, onChange }: { value: TournamentListStatus; onChange: (next: TournamentListStatus) => void }) {
  return (
    <div role="tablist" aria-label="Tournament lists" className="flex gap-1.5">
      {TOURNAMENT_LIST_TABS.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tournament-tab-${tab.id}`}
            aria-selected={active}
            aria-controls="tournament-list"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center h-10 px-4 rounded-full border text-sm transition-all cursor-pointer ${active ? 'border-amber-500/60 bg-amber-900/40 text-amber-100' : 'border-amber-900/40 text-amber-200/60 hover:text-amber-100 hover:border-amber-700/50'}`}
            style={SERIF}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** /tournaments: hero with the host button, your tournaments, recent champions and the public lists. */
export function TournamentsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get(TAB_PARAM);
  const tab: TournamentListStatus = isListTab(requested) ? requested : 'open';
  const available = useTournamentAvailability();
  const list = useTournamentList(tab);
  const tabCopy = TOURNAMENT_LIST_TABS.find((item) => item.id === tab) ?? TOURNAMENT_LIST_TABS[0];

  const selectTab = (next: TournamentListStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(TAB_PARAM, next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (available === false || list.status === 'unavailable') {
    return (
      <AccountShell>
        <TournamentsUnavailable />
      </AccountShell>
    );
  }

  return (
    <AccountShell>
      <div className="space-y-6 sm:space-y-8">
        <Hero />
        <MyTournaments />
        <RecentChampionsStrip champions={list.recentChampions} />

        <section className="space-y-3">
          <ListTabs value={tab} onChange={selectTab} />
          <div id="tournament-list" role="tabpanel" aria-labelledby={`tournament-tab-${tab}`} className="space-y-2.5">
            {list.status === 'loading' ? <TournamentSkeleton /> : null}
            {list.status === 'error' ? (
              <TournamentMessage
                title="The tournament board could not be read"
                action={
                  <Button onClick={list.reload} icon={<RefreshCw className="w-4 h-4" />}>
                    Try again
                  </Button>
                }
              >
                {list.error}
              </TournamentMessage>
            ) : null}
            {list.status === 'ready' && list.items.length === 0 ? <TournamentMessage title="Nothing here yet">{tabCopy.empty}</TournamentMessage> : null}
            {list.items.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
            {list.status === 'ready' && list.error ? <Notice tone="error">{list.error}</Notice> : null}
            {list.hasMore ? (
              <div className="flex justify-center pt-1">
                <Button onClick={list.loadMore} loading={list.loadingMore}>
                  Show more
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AccountShell>
  );
}
