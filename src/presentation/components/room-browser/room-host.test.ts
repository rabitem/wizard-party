import { describe, expect, it } from 'vitest';
import { REALTIME_HOST } from '@/config/deployment.config';

import {
  buildPartyRoomUrl,
  normalizePartyHostInput,
} from './room-host';

describe('room host settings', () => {
  it('moves retired hosts in saved settings and old Vercel variables to the new worker', () => {
    expect(normalizePartyHostInput('wizard-party.rabitem.partykit.dev')).toBe(REALTIME_HOST);
    expect(normalizePartyHostInput('https://wizard-party.rabitem.partykit.dev/party/abc123')).toBe(REALTIME_HOST);
  });

  it('normalizes host input before using it for sockets or storage', () => {
    expect(normalizePartyHostInput(' http://127.0.0.1:1999/ ')).toBe('127.0.0.1:1999');
    expect(normalizePartyHostInput('https://wizard-party.example.com/party/demo')).toBe(
      'wizard-party.example.com'
    );
  });

  it('uses the PartyServer room route with http locally and https remotely', () => {
    expect(buildPartyRoomUrl('127.0.0.1:1999', 'abc123')).toBe(
      'http://127.0.0.1:1999/parties/main/abc123'
    );
    expect(buildPartyRoomUrl('http://localhost:1999', 'abc123')).toBe(
      'http://localhost:1999/parties/main/abc123'
    );
    expect(buildPartyRoomUrl('wizard-party.example.com', 'abc123')).toBe(
      'https://wizard-party.example.com/parties/main/abc123'
    );
  });
});
