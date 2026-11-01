export type NotificationPermissionState = NotificationPermission | 'unsupported';

export interface NotificationToggleAction {
  enabled: boolean;
  shouldRequestPermission: boolean;
}

export function getBrowserNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

export function isNotificationPermissionGranted(permission: NotificationPermission): boolean {
  return permission === 'granted';
}

export function getNotificationToggleAction(
  currentlyEnabled: boolean,
  permission: NotificationPermissionState
): NotificationToggleAction {
  if (currentlyEnabled) {
    return { enabled: false, shouldRequestPermission: false };
  }

  if (permission === 'granted') {
    return { enabled: true, shouldRequestPermission: false };
  }

  if (permission === 'default') {
    return { enabled: false, shouldRequestPermission: true };
  }

  return { enabled: false, shouldRequestPermission: false };
}
