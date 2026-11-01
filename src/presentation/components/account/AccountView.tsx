'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Award, Database, LayoutDashboard, LogOut, Map as MapIcon, ScrollText, Shield, SlidersHorizontal, UserRound } from 'lucide-react';

import { useAccount } from '@/presentation/providers/AccountProvider';
import { PreferencesPanel } from '@/presentation/components/settings';

import { SectionDivider } from './AccountOrnaments';
import { AccountShell } from './AccountShell';
import { centeredScrollLeft } from './account-tabs.utils';
import { AchievementsSection } from './sections/AchievementsSection';
import { DataSection } from './sections/DataSection';
import { OwnPublicProfileLink } from './public/PublicProfileLink';
import { HistorySection } from './sections/HistorySection';
import { LevelCard } from './sections/LevelCard';
import { OverviewSection } from './sections/OverviewSection';
import { ProfileSection } from './sections/ProfileSection';
import { RewardsSection } from './sections/RewardsSection';
import { SecuritySection } from './sections/SecuritySection';
import { OwnTrophyCabinet } from './trophies';
import { Button, Notice, SERIF } from './ui';

const TABS = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'history', label: 'History', icon: <ScrollText className="w-4 h-4" /> },
  { id: 'achievements', label: 'Achievements', icon: <Award className="w-4 h-4" /> },
  { id: 'rewards', label: 'Rewards', icon: <MapIcon className="w-4 h-4" /> },
  { id: 'profile', label: 'Profile', icon: <UserRound className="w-4 h-4" /> },
  { id: 'preferences', label: 'Preferences', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'data', label: 'Data', icon: <Database className="w-4 h-4" /> },
] as const satisfies readonly { id: string; label: string; icon: ReactNode }[];

type TabId = (typeof TABS)[number]['id'];

function isTab(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-40 rounded-2xl bg-amber-900/10 animate-pulse" />
      <div className="h-12 rounded-xl bg-amber-900/10 animate-pulse" />
      <div className="h-72 rounded-2xl bg-amber-900/10 animate-pulse" />
    </div>
  );
}

interface AccountTabPanelProps {
  tab: TabId;
  userId: string;
  overview: NonNullable<ReturnType<typeof useAccount>['overview']>;
  onRefresh: () => void;
  onShowHistory: () => void;
}

function AccountTabPanel({ tab, userId, overview, onRefresh, onShowHistory }: AccountTabPanelProps) {
  switch (tab) {
    case 'overview': return <OverviewSection overview={overview} onImported={onRefresh} onShowHistory={onShowHistory} />;
    case 'history': return <HistorySection />;
    case 'achievements': return (
      <div className="space-y-4 sm:space-y-5">
        <OwnTrophyCabinet userId={userId} />
        <AchievementsSection overview={overview} />
      </div>
    );
    case 'rewards': return <RewardsSection overview={overview} />;
    case 'profile': return <ProfileSection overview={overview} onSaved={onRefresh} />;
    case 'preferences': return <PreferencesPanel />;
    case 'security': return <SecuritySection />;
    case 'data': return <DataSection />;
  }
}

export function AccountView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, user, overview, refreshOverview, signOut } = useAccount();
  const requested = searchParams.get('tab');
  const tab: TabId = isTab(requested) ? requested : 'overview';
  const welcome = searchParams.get('welcome') === '1';

  const signingOut = useRef(false);
  const tabBar = useRef<HTMLElement>(null);
  const tabsShown = status === 'signed-in' && overview !== null;

  useEffect(() => {
    if (status === 'guest' && !signingOut.current) router.replace('/sign-in?next=/account');
  }, [status, router]);

  // On narrow screens the tab bar scrolls sideways; center the active tab when the tab changes or
  // the bar first appears. Only the bar scrolls: the page itself never moves, also not when the
  // overview refreshes (privacy toggles, recorded games) while the user reads further down.
  useEffect(() => {
    const bar = tabBar.current;
    const active = bar?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!bar || !active) return;
    const left = centeredScrollLeft({
      viewportWidth: bar.clientWidth,
      contentWidth: bar.scrollWidth,
      itemOffset: active.getBoundingClientRect().left - bar.getBoundingClientRect().left + bar.scrollLeft,
      itemWidth: active.offsetWidth,
    });
    bar.scrollTo({ left, behavior: 'smooth' });
  }, [tab, tabsShown]);

  const selectTab = (next: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    params.delete('welcome');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSignOut = async () => {
    signingOut.current = true;
    await signOut();
    router.replace('/');
  };

  return (
    <AccountShell
      action={
        status === 'signed-in' ? (
          <Button variant="ghost" onClick={handleSignOut} icon={<LogOut className="w-4 h-4" />} aria-label="Sign out" className="px-2.5 sm:px-4">
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        ) : null
      }
    >
      {status !== 'signed-in' || !user || !overview ? (
        <LoadingState />
      ) : (
        <div className="space-y-5 sm:space-y-6">
          {welcome ? (
            <Notice tone="success">
              <span style={SERIF}>Welcome, {user.displayUsername}!</span> Your stats, rewards and settings are now saved to your account and follow you to every device.
            </Notice>
          ) : null}

          <LevelCard name={user.displayUsername} overview={overview} footer={<OwnPublicProfileLink />} />
          <SectionDivider />

          {/* Phones: one swipeable row. From sm up the tabs wrap, so none is ever out of reach. */}
          <nav ref={tabBar} aria-label="Account sections" className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible [scrollbar-width:none]">
            <div role="tablist" className="flex gap-1.5 sm:gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
              {TABS.map((item) => {
                const active = item.id === tab;
                return (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => selectTab(item.id)}
                    className={`inline-flex items-center gap-2 h-11 px-4 rounded-full border text-sm transition-all cursor-pointer ${active ? 'border-amber-500/60 bg-amber-900/40 text-amber-100' : 'border-amber-900/40 text-amber-200/60 hover:text-amber-100 hover:border-amber-700/50'}`}
                    style={SERIF}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div role="tabpanel">
            <AccountTabPanel tab={tab} userId={user.id} overview={overview} onRefresh={refreshOverview} onShowHistory={() => selectTab('history')} />
          </div>
        </div>
      )}
    </AccountShell>
  );
}
