'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import type { PublicPlayerCard } from '@shared/domain/social';
import { PlayerAvatar } from '../account/PlayerAvatar';
import { useProfileSearch, type ProfileSearchState } from './useProfileSearch';


/** The field sits on the dock on wide screens, alone over the page on phones (so nearly opaque there). */
const FIELD_BG = {
  dock: 'bg-[color-mix(in_srgb,var(--page-base)_70%,transparent)] sm:w-56 lg:w-64',
  phone: 'bg-[color-mix(in_srgb,var(--page-base)_96%,transparent)] shadow-[0_10px_30px_rgba(0,0,0,0.5)]',
} as const;

const STATUS_TEXT: Partial<Record<ProfileSearchState['status'], string>> = {
  loading: 'Looking through the halls…',
  'rate-limited': 'Easy there. Try again in a minute.',
  error: 'The search is unavailable right now.',
};

function statusText(state: ProfileSearchState, query: string): string | null {
  if (state.status === 'ready') return state.players.length === 0 ? `No public profile matches “${query.trim()}”.` : null;
  return STATUS_TEXT[state.status] ?? null;
}

function optionId(listId: string, player: PublicPlayerCard): string {
  return `${listId}-${player.username}`;
}

interface ResultsProps {
  listId: string;
  state: ProfileSearchState;
  query: string;
  active: number;
  phone: boolean;
  onPick: (player: PublicPlayerCard) => void;
  onHover: (index: number) => void;
}

/** The dropdown: matching profiles with avatar, name and level, or one line saying why there are none. */
function SearchResults({ listId, state, query, active, phone, onPick, onHover }: ResultsProps) {
  const players = state.status === 'ready' ? state.players : [];
  const text = statusText(state, query);
  return (
    <div className={`absolute top-[calc(100%+0.6rem)] ${phone ? 'left-0 right-0' : 'right-0 w-72'} z-40 rounded-2xl border border-amber-600/35 bg-[var(--page-base)] shadow-[0_18px_50px_rgba(0,0,0,0.6)] overflow-hidden`}>
      <ul id={listId} role="listbox" aria-label="Players" className={players.length ? 'py-1.5' : ''}>
        {players.map((player, index) => (
          <li
            key={player.username}
            id={optionId(listId, player)}
            role="option"
            aria-selected={index === active}
            tabIndex={-1}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onPick(player)}
            onKeyDown={(event) => { if (event.key === 'Enter') onPick(player); }}
            onPointerEnter={() => onHover(index)}
            className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${index === active ? 'bg-amber-900/40' : ''}`}
          >
            <PlayerAvatar appearance={player.appearance} label={player.displayName} level={player.level} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm text-amber-50 font-serif">{player.displayName}</span>
            <span className="text-xs text-amber-300/80 tabular-nums font-serif">Level {player.level}</span>
          </li>
        ))}
      </ul>
      {text ? <p role="status" className="px-3 py-3 text-sm text-amber-200/80 font-serif">{text}</p> : null}
    </div>
  );
}

/**
 * Closes the search when a pointer goes down outside every given element (the dock button and the
 * field, which a phone renders in a portal).
 */
function useDismissOutside(refs: readonly RefObject<HTMLElement | null>[], onDismiss: () => void) {
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!refs.some((ref) => ref.current?.contains(event.target as Node))) onDismiss();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [refs, onDismiss]);
}

/**
 * The start page's player lookup, in the top-right dock: type a name, pick a public profile, land
 * on its page. A field on wider screens. On phones an icon opens a full-width field, rendered in a
 * portal because the dock's slide animation would otherwise contain its fixed position.
 */
export function ProfileSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const state = useProfileSearch(query);
  const players = state.status === 'ready' ? state.players : [];
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [refs] = useState(() => [rootRef, panelRef] as const);
  const [dismiss] = useState(() => () => {
    setOpen(false);
    setPhoneOpen(false);
  });
  useDismissOutside(refs, dismiss);

  const pick = (player: PublicPlayerCard) => {
    dismiss();
    router.push(`/u/${player.username}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') return dismiss();
    if (!players.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + players.length) % players.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(players[Math.max(active, 0)]);
    }
  };

  const panel = (
    <div ref={panelRef} className={phoneOpen ? 'fixed left-3 right-3 top-[4.25rem] z-40' : 'relative hidden sm:block'}>
      <div className={`flex items-center h-11 rounded-full px-3.5 gap-2 border border-amber-700/30 focus-within:border-amber-400/70 focus-within:ring-2 focus-within:ring-amber-400/30 ${phoneOpen ? FIELD_BG.phone : FIELD_BG.dock}`}>
        <Search className="w-4 h-4 shrink-0 text-amber-300/80" aria-hidden />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open ? state.status !== 'idle' : false}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && players[active] ? optionId(listId, players[active]) : undefined}
          aria-label="Find a player by name"
          placeholder="Find a player"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          className="focus-shown-by-parent min-w-0 flex-1 bg-transparent text-sm text-amber-50 placeholder:text-amber-200/55 font-serif"
        />
        {state.status === 'loading' ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-amber-300/70" aria-hidden /> : null}
        {query ? (
          <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear search" className="shrink-0 text-amber-300/70 hover:text-amber-100 cursor-pointer">
            <X className="w-4 h-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {open && state.status !== 'idle' ? (
        <SearchResults listId={listId} state={state} query={query} active={active} phone={phoneOpen} onPick={pick} onHover={setActive} />
      ) : null}
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setPhoneOpen(true);
          queueMicrotask(() => inputRef.current?.focus());
        }}
        aria-label="Find a player"
        className="sm:hidden inline-flex items-center justify-center h-11 w-11 rounded-full text-amber-200/90 hover:text-amber-50 hover:bg-amber-900/35 transition-colors cursor-pointer"
      >
        <Search className="w-4 h-4" aria-hidden />
      </button>
      {phoneOpen ? createPortal(panel, document.body) : panel}
    </div>
  );
}
