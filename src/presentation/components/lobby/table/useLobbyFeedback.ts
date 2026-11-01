'use client';

import { useEffect, useRef, useState } from 'react';
import type { LobbyActivityEntry } from '@/presentation/types';
import type { LobbyActivityView, LobbyInviteView, RuleChip } from './lobby-view.types';

const TOAST_MS = 4000;
const HIGHLIGHT_MS = 2500;
const MAX_TOASTS = 3;


function describe(event: LobbyActivityEntry, localName: string | null): string {
  const who = event.playerName ?? 'Someone';
  switch (event.kind) {
    case 'joined': return `${who} sat down`;
    case 'left': return `${who} left the table`;
    case 'kicked': return `${who} was removed`;
    case 'host': return event.playerName === localName ? 'You are the host now' : `${who} is the host now`;
    case 'rules': return 'The host changed the rules';
    case 'settings': return 'The host changed the table settings';
  }
}

/**
 * Short-lived toasts for what happens at the table: server activity plus invite answers. Only
 * events that arrive after mounting are shown, so a reload doesn't replay history.
 */
export function useLobbyToasts(activity: LobbyActivityEntry[], invites: LobbyInviteView[], localName: string | null): LobbyActivityView[] {
  const [toasts, setToasts] = useState<LobbyActivityView[]>([]);
  const seenActivity = useRef<Set<string> | null>(null);
  const inviteStates = useRef<Map<string, LobbyInviteView['state']> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const fresh: LobbyActivityView[] = [];
    if (seenActivity.current === null) {
      seenActivity.current = new Set(activity.map((event) => event.id));
    } else {
      for (const event of activity) {
        if (seenActivity.current.has(event.id)) continue;
        seenActivity.current.add(event.id);
        fresh.push({ id: event.id, kind: event.kind, text: describe(event, localName) });
      }
    }
    const known = inviteStates.current;
    inviteStates.current = new Map(invites.map((invite) => [invite.id, invite.state]));
    if (known) {
      for (const invite of invites) {
        const before = known.get(invite.id);
        if (before && before !== invite.state && (invite.state === 'accepted' || invite.state === 'declined')) {
          fresh.push({
            id: `invite-${invite.id}-${invite.state}`,
            kind: 'invite-accepted',
            text: invite.state === 'accepted' ? `${invite.name} accepted your invite` : `${invite.name} declined your invite`,
            appearance: invite.appearance,
          });
        }
      }
    }
    if (!fresh.length) return;
    queueMicrotask(() => setToasts((current) => [...current, ...fresh].slice(-MAX_TOASTS)));
    // Not cleared on re-run: a later poll must not keep an earlier toast on screen.
    const ids = new Set(fresh.map((toast) => toast.id));
    timers.current.push(setTimeout(() => setToasts((current) => current.filter((toast) => !ids.has(toast.id))), TOAST_MS));
  }, [activity, invites, localName]);

  return toasts;
}

/** Briefly highlights the rule chip that just changed, so players notice rule edits. */
export function useChangedRuleHighlight(chips: RuleChip[]): string | null {
  const [highlight, setHighlight] = useState<string | null>(null);
  const previous = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    const current = new Map(chips.map((chip) => [chip.id, chip.label]));
    const before = previous.current;
    previous.current = current;
    if (!before) return;
    const changed = chips.find((chip) => before.get(chip.id) !== chip.label);
    if (!changed) return;
    queueMicrotask(() => setHighlight(changed.id));
    const timer = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [chips]);

  return highlight;
}
