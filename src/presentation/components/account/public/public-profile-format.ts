/*
 * Formatting for the public profile. Fixed locale and UTC so server and client render identical
 * text regardless of where the page is generated.
 */

const DATE = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
const NUMBER = new Intl.NumberFormat('en-US');

export const formatDate = (timestamp: number) => DATE.format(new Date(timestamp));
export const formatMonth = (timestamp: number) => MONTH.format(new Date(timestamp));
export const formatNumber = (value: number) => NUMBER.format(Math.round(value));
export const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

export function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  return `${value}${{ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] ?? 'th'}`;
}
