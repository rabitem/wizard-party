'use client';

import type { PlayerProfile, ProfileChanges } from '@shared/domain/account';
import { normalizeUsername } from '@shared/domain/account/username';

import { accountApi } from './account-api';
import { authClient, unwrap } from './auth-client';

/*
 * Browser calls behind the profile settings: visibility flags live on the player profile
 * (/api/account), the name itself on the Better Auth user (username plugin).
 */

export type ProfileVisibilityChanges = Pick<ProfileChanges, 'isPublic' | 'showHistory'>;

export async function updateProfileVisibility(changes: ProfileVisibilityChanges): Promise<PlayerProfile> {
  const { profile } = await accountApi.updateProfile(changes);
  return profile;
}

/**
 * Renames the player or changes the casing of their name. The server validates it, checks that it
 * is free and enforces the rename cooldown (username-hooks.ts); the typed casing is kept as
 * displayUsername.
 */
export async function changeUsername(value: string): Promise<void> {
  const displayUsername = value.trim();
  await unwrap(authClient.updateUser({ username: normalizeUsername(displayUsername), displayUsername }));
}
