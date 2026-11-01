import { describe, expect, it } from 'vitest';

import { clientNetworkKey } from './client-network';

describe('clientNetworkKey', () => {
  it('keeps IPv4 addresses', () => {
    expect(clientNetworkKey(' 203.0.113.7 ')).toBe('203.0.113.7');
    expect(clientNetworkKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
  });

  it('buckets every address of an IPv6 /64 into one key', () => {
    const a = clientNetworkKey('2001:db8:abcd:12:1:2:3:4');
    const b = clientNetworkKey('2001:0db8:abcd:0012:ffff:ffff:ffff:ffff');
    const c = clientNetworkKey('[2001:db8:abcd:12::99]');
    expect(a).toBe('2001:db8:abcd:12::/64');
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(clientNetworkKey('2001:db8:abcd:13::1')).not.toBe(a);
  });

  it('handles compressed prefixes and zone ids', () => {
    expect(clientNetworkKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(clientNetworkKey('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
  });

  it('falls back to the raw value for unparsable input', () => {
    expect(clientNetworkKey('unknown')).toBe('unknown');
    expect(clientNetworkKey('1:2:3')).toBe('1:2:3');
  });
});
