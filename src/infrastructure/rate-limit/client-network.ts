/**
 * Groups client addresses into the unit one subscriber controls: an IPv4 address, or an IPv6 /64
 * (a single host can rotate through its whole /64, so per-address IPv6 limits are trivially
 * bypassed). The result is only ever used as an ephemeral, keyed-hash rate-limit subject.
 */

const IPV6_GROUPS = 8;
/** The /64 prefix is the first four 16-bit groups. */
const IPV6_PREFIX_GROUPS = 4;
const IPV4_PATTERN = /^(\d{1,3})(\.\d{1,3}){3}$/;
const IPV6_GROUP_PATTERN = /^[0-9a-f]{1,4}$/;

function expandIpv6(address: string): string[] | null {
  const halves = address.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  // An embedded IPv4 tail (e.g. ::ffff:1.2.3.4) occupies two groups.
  const lastTail = (halves.length === 2 ? tail : head).at(-1);
  const embeddedIpv4 = lastTail !== undefined && IPV4_PATTERN.test(lastTail) ? 1 : 0;
  const present = head.length + tail.length + embeddedIpv4;
  if (halves.length === 1 && present !== IPV6_GROUPS) return null;
  if (halves.length === 2 && present >= IPV6_GROUPS) return null;
  const groups = [...head, ...Array<string>(IPV6_GROUPS - present).fill('0'), ...tail];
  return groups;
}

/** IPv4-mapped IPv6 (::ffff:a.b.c.d) is reported as the IPv4 address it carries. */
const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/;

export function clientNetworkKey(rawAddress: string): string {
  const address = rawAddress.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  const mapped = IPV4_MAPPED.exec(address);
  if (mapped) return mapped[1];
  if (!address.includes(':')) return address;

  const groups = expandIpv6(address);
  if (!groups) return address;
  const prefix = groups.slice(0, IPV6_PREFIX_GROUPS);
  if (!prefix.every((group) => IPV6_GROUP_PATTERN.test(group))) return address;
  return `${prefix.map((group) => group.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}
