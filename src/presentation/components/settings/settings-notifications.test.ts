import { describe, expect, it } from 'vitest';

import {
  getNotificationToggleAction,
  isNotificationPermissionGranted,
} from './settings-notifications';

describe('settings notification helpers', () => {
  it('turns notifications off without requesting browser permission', () => {
    expect(getNotificationToggleAction(true, 'granted')).toEqual({
      enabled: false,
      shouldRequestPermission: false,
    });
  });

  it('turns notifications on immediately when permission is already granted', () => {
    expect(getNotificationToggleAction(false, 'granted')).toEqual({
      enabled: true,
      shouldRequestPermission: false,
    });
  });

  it('requests browser permission when enabling from the default state', () => {
    expect(getNotificationToggleAction(false, 'default')).toEqual({
      enabled: false,
      shouldRequestPermission: true,
    });
  });

  it('keeps notifications off when unsupported or denied', () => {
    expect(getNotificationToggleAction(false, 'denied')).toEqual({
      enabled: false,
      shouldRequestPermission: false,
    });
    expect(getNotificationToggleAction(false, 'unsupported')).toEqual({
      enabled: false,
      shouldRequestPermission: false,
    });
  });

  it('only treats granted permission as enabled after a permission request', () => {
    expect(isNotificationPermissionGranted('granted')).toBe(true);
    expect(isNotificationPermissionGranted('default')).toBe(false);
    expect(isNotificationPermissionGranted('denied')).toBe(false);
  });
});
